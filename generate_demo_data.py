import calendar
import random
from datetime import date, datetime, timedelta

import pandas as pd
from faker import Faker


SEED = 42
CUSTOMER_COUNT = 10_000
DEPOSIT_COUNT = 18_000

CITIES = ["Jakarta", "Bandung", "Surabaya", "Semarang", "Medan", "Yogyakarta"]
SEGMENTS = ["Mass", "Priority", "SME"]
BRANCH_CODES = ["JKT01", "JKT02", "BDG01", "SBY01", "SMG01", "MDN01", "YGY01"]
PRODUCT_TYPES = ["Savings", "Time Deposit"]
STATUSES = ["ACTIVE", "INACTIVE"]


def seed_everything() -> Faker:
    random.seed(SEED)
    Faker.seed(SEED)
    return Faker("id_ID")


def format_date(value: date) -> str:
    return value.strftime("%Y-%m-%d")


def clean_full_name(value: str) -> str:
    cleaned = value.replace('"', " ").replace(",", " ")
    return " ".join(cleaned.split())


def random_date(start: date, end: date) -> date:
    day_span = (end - start).days
    return start + timedelta(days=random.randint(0, day_span))


def date_in_current_week(target_date: date, today: date) -> bool:
    week_start = today - timedelta(days=today.weekday())
    week_days = {(week_start + timedelta(days=offset)).strftime("%m-%d") for offset in range(7)}
    target_day = target_date.strftime("%m-%d")

    # Treat leap-day birthdays as Feb 28 in non-leap years for reporting purposes.
    if target_day == "02-29" and not calendar.isleap(today.year):
        target_day = "02-28"

    return target_day in week_days


def generate_birth_date(today: date, birthday_this_week: bool) -> date:
    birth_year = random.randint(1960, 2003)
    if birthday_this_week:
        week_start = today - timedelta(days=today.weekday())
        birthday_anchor = week_start + timedelta(days=random.randint(0, 6))
        return birthday_anchor.replace(year=birth_year)

    while True:
        candidate = random_date(date(1960, 1, 1), date(2003, 12, 31))
        if not date_in_current_week(candidate, today):
            return candidate


def generate_join_date(birth_date: date, today: date) -> date:
    eligible_start = max(birth_date + timedelta(days=18 * 365), date(2010, 1, 1))
    eligible_end = today - timedelta(days=1)
    if eligible_start > eligible_end:
        eligible_start = date(2010, 1, 1)
    return random_date(eligible_start, eligible_end)


def choose_segment() -> str:
    return random.choices(SEGMENTS, weights=[0.62, 0.20, 0.18], k=1)[0]


def choose_city() -> str:
    return random.choice(CITIES)


def customer_sampling_weight(segment: str) -> int:
    if segment == "Priority":
        return 5
    if segment == "SME":
        return 3
    return 2


def choose_product_type(segment: str) -> str:
    if segment == "Priority":
        return random.choices(PRODUCT_TYPES, weights=[0.45, 0.55], k=1)[0]
    if segment == "SME":
        return random.choices(PRODUCT_TYPES, weights=[0.60, 0.40], k=1)[0]
    return random.choices(PRODUCT_TYPES, weights=[0.75, 0.25], k=1)[0]


def generate_balance(segment: str, product_type: str) -> int:
    if product_type == "Savings":
        if segment == "Priority":
            return int(random.triangular(10_000_000, 250_000_000, 90_000_000))
        if segment == "SME":
            return int(random.triangular(5_000_000, 120_000_000, 35_000_000))
        return int(random.triangular(1_000_000, 50_000_000, 10_000_000))

    if segment == "Priority":
        return int(random.triangular(150_000_000, 2_000_000_000, 900_000_000))
    if segment == "SME":
        return int(random.triangular(75_000_000, 1_250_000_000, 450_000_000))
    return int(random.triangular(50_000_000, 1_000_000_000, 220_000_000))


def generate_maturity_date(today: date, product_type: str, near_term: bool) -> date:
    if near_term:
        return today + timedelta(days=random.randint(1, 14))

    if product_type == "Time Deposit":
        return today + timedelta(days=random.randint(15, 365))
    return today + timedelta(days=random.randint(30, 730))


def generate_customers() -> pd.DataFrame:
    fake = seed_everything()
    today = date.today()
    birthday_customer_ids = set(random.sample(range(1, CUSTOMER_COUNT + 1), 8))

    rows = []
    for customer_id in range(1, CUSTOMER_COUNT + 1):
        birth_date = generate_birth_date(
            today=today,
            birthday_this_week=customer_id in birthday_customer_ids,
        )
        join_date = generate_join_date(birth_date=birth_date, today=today)
        rows.append(
            {
                "customer_id": customer_id,
                "full_name": clean_full_name(fake.name()),
                "birth_date": format_date(birth_date),
                "city": choose_city(),
                "segment": choose_segment(),
                "join_date": format_date(join_date),
            }
        )

    return pd.DataFrame(rows)


def generate_deposits(customers_df: pd.DataFrame) -> pd.DataFrame:
    today = date.today()
    customer_records = customers_df.to_dict("records")
    weights = [customer_sampling_weight(record["segment"]) for record in customer_records]

    near_term_indices = set(random.sample(range(DEPOSIT_COUNT), 12))
    rows = []
    for offset in range(DEPOSIT_COUNT):
        customer = random.choices(customer_records, weights=weights, k=1)[0]
        customer_id = int(customer["customer_id"])
        segment = customer["segment"]
        product_type = choose_product_type(segment)
        if offset in near_term_indices:
            product_type = "Time Deposit"

        if offset < int(DEPOSIT_COUNT * 0.84):
            status = "ACTIVE"
        else:
            status = random.choices(STATUSES, weights=[0.25, 0.75], k=1)[0]

        rows.append(
            {
                "account_id": 1001 + offset,
                "customer_id": customer_id,
                "product_type": product_type,
                "balance": generate_balance(segment=segment, product_type=product_type),
                "maturity_date": format_date(
                    generate_maturity_date(
                        today=today,
                        product_type=product_type,
                        near_term=offset in near_term_indices,
                    )
                ),
                "branch_code": random.choice(BRANCH_CODES),
                "status": status,
            }
        )

    return pd.DataFrame(rows)


def validate_join(customers_df: pd.DataFrame, deposits_df: pd.DataFrame) -> bool:
    customer_ids = set(customers_df["customer_id"].tolist())
    deposit_customer_ids = set(deposits_df["customer_id"].tolist())
    orphan_ids = sorted(deposit_customer_ids - customer_ids)
    is_valid = len(orphan_ids) == 0

    print("\nJoin validation")
    print(f"- all deposits.customer_id values exist in customers.customer_id: {is_valid}")
    print(f"- two tables are safe to join on customer_id: {is_valid}")
    if not is_valid:
        print(f"- orphan customer_id values: {orphan_ids}")

    return is_valid


def count_birthdays_this_week(customers_df: pd.DataFrame) -> int:
    today = date.today()
    birth_dates = customers_df["birth_date"].apply(lambda value: datetime.strptime(value, "%Y-%m-%d").date())
    return int(sum(date_in_current_week(birth_date, today) for birth_date in birth_dates))


def count_maturing_next_14_days(deposits_df: pd.DataFrame) -> int:
    today = date.today()
    end_date = today + timedelta(days=14)
    maturity_dates = deposits_df["maturity_date"].apply(lambda value: datetime.strptime(value, "%Y-%m-%d").date())
    return int(sum(today <= maturity_date <= end_date for maturity_date in maturity_dates))


def main() -> None:
    customers_df = generate_customers()
    deposits_df = generate_deposits(customers_df)

    join_is_valid = validate_join(customers_df, deposits_df)
    if not join_is_valid:
        raise ValueError("Generated deposits contain invalid customer_id values.")

    customers_df.to_csv("customers.csv", index=False)
    deposits_df.to_csv("deposits.csv", index=False)

    total_active = int((deposits_df["status"] == "ACTIVE").sum())
    total_inactive = int((deposits_df["status"] == "INACTIVE").sum())
    maturing_next_14_days = count_maturing_next_14_days(deposits_df)
    birthdays_this_week = count_birthdays_this_week(customers_df)

    print("\ncustomers.csv preview")
    print(customers_df.head(5).to_string(index=False))

    print("\ndeposits.csv preview")
    print(deposits_df.head(5).to_string(index=False))

    print("\nSummary metrics")
    print(f"- total customers: {len(customers_df)}")
    print(f"- total deposits: {len(deposits_df)}")
    print(f"- total active deposits: {total_active}")
    print(f"- total inactive deposits: {total_inactive}")
    print(f"- total deposits maturing in the next 14 days: {maturing_next_14_days}")
    print(f"- total customers with birthdays in the current week: {birthdays_this_week}")


if __name__ == "__main__":
    main()
