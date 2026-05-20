package repo

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/home-ledger/api/internal/domain"
)

// BootstrapResult is returned after creating a new household with default data.
type BootstrapResult struct {
	Household      *domain.Household
	SelfActor      *domain.Actor
	PartnerActor   *domain.Actor
	SharedActor    *domain.Actor
	Accounts       []*domain.Account
	PaymentMethods []*domain.PaymentMethod
}

// BootstrapHousehold creates a household, 3 default actors, default categories,
// default accounts, default payment methods, and a user record for the caller.
func BootstrapHousehold(ctx context.Context, uid, email, householdName string) (*BootstrapResult, error) {
	now := time.Now().UTC()
	householdID := uuid.NewString()

	household := &domain.Household{
		ID:        householdID,
		Name:      householdName,
		CreatedAt: now,
		UpdatedAt: now,
	}
	if err := CreateHousehold(ctx, household); err != nil {
		return nil, fmt.Errorf("create household: %w", err)
	}

	selfActor := &domain.Actor{
		ID:          uuid.NewString(),
		HouseholdID: householdID,
		DisplayName: "我",
		Type:        domain.ActorPersonal,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	partnerActor := &domain.Actor{
		ID:          uuid.NewString(),
		HouseholdID: householdID,
		DisplayName: "伴侣",
		Type:        domain.ActorPersonal,
		CreatedAt:   now.Add(time.Millisecond),
		UpdatedAt:   now.Add(time.Millisecond),
	}
	sharedActor := &domain.Actor{
		ID:          uuid.NewString(),
		HouseholdID: householdID,
		DisplayName: "共同",
		Type:        domain.ActorHouseholdShared,
		CreatedAt:   now.Add(2 * time.Millisecond),
		UpdatedAt:   now.Add(2 * time.Millisecond),
	}
	for _, a := range []*domain.Actor{selfActor, partnerActor, sharedActor} {
		if err := CreateActor(ctx, a); err != nil {
			return nil, fmt.Errorf("create actor %s: %w", a.DisplayName, err)
		}
	}

	if err := seedCategories(ctx, householdID, now); err != nil {
		return nil, fmt.Errorf("seed categories: %w", err)
	}

	accounts, paymentMethods, err := seedAccountsAndPaymentMethods(ctx, householdID, selfActor.ID, now)
	if err != nil {
		return nil, fmt.Errorf("seed accounts: %w", err)
	}

	userRecord := &domain.UserRecord{
		UID:         uid,
		HouseholdID: householdID,
		ActorID:     selfActor.ID,
		Email:       email,
		CreatedAt:   now,
	}
	if err := CreateUser(ctx, userRecord); err != nil {
		return nil, fmt.Errorf("create user record: %w", err)
	}

	return &BootstrapResult{
		Household:      household,
		SelfActor:      selfActor,
		PartnerActor:   partnerActor,
		SharedActor:    sharedActor,
		Accounts:       accounts,
		PaymentMethods: paymentMethods,
	}, nil
}

type seedCat struct {
	name  string
	type_ domain.CategoryType
	order int
}

var defaultCategories = []seedCat{
	// Expense
	{"餐饮", domain.CatExpense, 10},
	{"交通", domain.CatExpense, 20},
	{"购物", domain.CatExpense, 30},
	{"娱乐", domain.CatExpense, 40},
	{"水电网", domain.CatExpense, 50},
	{"医疗", domain.CatExpense, 60},
	{"日用品", domain.CatExpense, 70},
	{"房租", domain.CatExpense, 80},
	{"保险", domain.CatExpense, 90},
	{"其他支出", domain.CatExpense, 100},
	// Income
	{"工资", domain.CatIncome, 10},
	{"奖金", domain.CatIncome, 20},
	{"副业", domain.CatIncome, 30},
	{"其他收入", domain.CatIncome, 40},
}

func seedCategories(ctx context.Context, householdID string, now time.Time) error {
	for i, sc := range defaultCategories {
		c := &domain.Category{
			ID:          uuid.NewString(),
			HouseholdID: householdID,
			Name:        sc.name,
			Type:        sc.type_,
			SortOrder:   sc.order,
			IsDefault:   true,
			CreatedAt:   now.Add(time.Duration(i) * time.Millisecond),
			UpdatedAt:   now.Add(time.Duration(i) * time.Millisecond),
		}
		if err := CreateCategory(ctx, c); err != nil {
			return err
		}
	}
	return nil
}

type seedAcct struct {
	name     string
	acctType domain.AccountType
	currency domain.Currency
}

var defaultAccounts = []seedAcct{
	{"現金", domain.AccountCash, domain.CurrencyJPY},
	{"PayPay", domain.AccountPayPay, domain.CurrencyJPY},
	{"銀行口座", domain.AccountBankAccount, domain.CurrencyJPY},
	{"人民币账户", domain.AccountCNYRMB, domain.CurrencyCNY},
}

func seedAccountsAndPaymentMethods(ctx context.Context, householdID, ownerActorID string, now time.Time) ([]*domain.Account, []*domain.PaymentMethod, error) {
	accounts := make([]*domain.Account, 0, len(defaultAccounts))
	for i, sa := range defaultAccounts {
		a := &domain.Account{
			ID:           uuid.NewString(),
			HouseholdID:  householdID,
			Name:         sa.name,
			Type:         sa.acctType,
			Currency:     sa.currency,
			OwnerActorID: ownerActorID,
			IsActive:     true,
			CreatedAt:    now.Add(time.Duration(i) * time.Millisecond),
			UpdatedAt:    now.Add(time.Duration(i) * time.Millisecond),
		}
		if err := CreateAccount(ctx, a); err != nil {
			return nil, nil, err
		}
		accounts = append(accounts, a)
	}

	// Create payment methods for non-CNY accounts (cash, PayPay, bank).
	pms := make([]*domain.PaymentMethod, 0, 3)
	for i, a := range accounts[:3] {
		pm := &domain.PaymentMethod{
			ID:           uuid.NewString(),
			HouseholdID:  householdID,
			Name:         a.Name,
			Type:         a.Type,
			Currency:     a.Currency,
			OwnerActorID: ownerActorID,
			IsActive:     true,
			CreatedAt:    now.Add(time.Duration(i) * time.Millisecond),
			UpdatedAt:    now.Add(time.Duration(i) * time.Millisecond),
		}
		if err := CreatePaymentMethod(ctx, pm); err != nil {
			return nil, nil, err
		}
		pms = append(pms, pm)
	}
	return accounts, pms, nil
}
