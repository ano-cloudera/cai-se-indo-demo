import calendar
import csv
import random
from datetime import date, datetime, timedelta


SEED = 42
CUSTOMER_COUNT = 10_000
DEPOSIT_COUNT = 18_000
CREDIT_COUNT = 12_000

CITIES = ["Jakarta", "Bandung", "Surabaya", "Semarang", "Medan", "Yogyakarta"]
SEGMENTS = ["Mass", "Priority", "SME"]
BRANCH_CODES = ["JKT01", "JKT02", "BDG01", "SBY01", "SMG01", "MDN01", "YGY01"]
PRODUCT_TYPES = ["Savings", "Time Deposit"]
STATUSES = ["ACTIVE", "INACTIVE"]
CREDIT_TYPES = ["Mortgage", "Working Capital", "Auto Loan", "Personal Loan", "Credit Card"]
CREDIT_STATUSES = ["ACTIVE", "CLOSED", "RESTRUCTURED"]
COLLECTIBILITY_STATUSES = ["CURRENT", "SPECIAL_MENTION", "SUBSTANDARD", "DOUBTFUL"]

NAME_PREFIXES = ["", "", "", "dr.", "drg.", "Ir.", "H.", "Hj.", "KH.", "Tgk.", "Dt.", "R.A.", "R.M.", "Drs."]
FIRST_NAMES = [
    "Ayu", "Salsabila", "Intan", "Rachel", "Nadia", "Olivia", "Julia", "Ani", "Indah", "Maya",
    "Putri", "Kezia", "Gabriella", "Lalita", "Zahra", "Talia", "Rafi", "Irfan", "Bagus", "Mahfud",
    "Lukman", "Hasan", "Dodo", "Catur", "Taufan", "Satya", "Paiman", "Dian", "Restu", "Lanjar",
    "Yessi", "Endah", "Anita", "Hesti", "Shania", "Cindy", "Michelle", "Kamila", "Vera", "Ifa",
]
MIDDLE_NAMES = [
    "Utami", "Laksita", "Prasetya", "Padmasari", "Rahmawati", "Puspasari", "Pradipta", "Wacana",
    "Permata", "Hidayat", "Palastri", "Mandala", "Kurniawan", "Saptono", "Sihombing", "Sinaga",
    "Hutagalung", "Prabowo", "Haryanto", "Sitorus", "Mangunsong", "Sirait", "Nasyiah", "Mayasari",
    "Gunawan", "Prakasa", "Halim", "Nababan", "Thamrin", "Hasanah",
]
LAST_NAMES = [
    "Wijayanti", "Pratama", "Halimah", "Firmansyah", "Haryanti", "Nuraini", "Siregar", "Purnawati",
    "Gunarto", "Kusuma", "Maheswara", "Yulianti", "Wibowo", "Suryatmi", "Suwarno", "Simbolon",
    "Latupono", "Sitompul", "Adriansyah", "Widiastuti", "Narpati", "Kuswoyo", "Pranowo", "Hastuti",
    "Melani", "Anggraini", "Hariyah", "Maryati", "Uyainah", "Prasasta",
]
NAME_SUFFIXES = ["", "", "", "S.E.", "S.H.", "S.T.", "S.Kom", "S.Psi", "M.Kom.", "M.TI.", "M.M.", "S.Farm", "S.Pd", "S.E.I", "M.Ak", "S.Gz", "S.Pt", "M.Farm"]


def format_date(value: date) -> str:
    return value.strftime("%Y-%m-%d")


def clean_full_name(value: str) -> str:
    return " ".join(value.replace('"', " ").replace(",", " ").split())


def random_date(start: date, end: date) -> date:
    day_span = (end - start).days
    return start + timedelta(days=random.randint(0, day_span))


def date_in_current_week(target_date: date, today: date) -> bool:
    week_start = today - timedelta(days=today.weekday())
    week_days = {(week_start + timedelta(days=offset)).strftime("%m-%d") for offset in range(7)}
    target_day = target_date.strftime("%m-%d")

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


def build_full_name() -> str:
    prefix = random.choice(NAME_PREFIXES)
    pieces = [prefix, random.choice(FIRST_NAMES), random.choice(MIDDLE_NAMES), random.choice(LAST_NAMES)]
    if random.random() < 0.18:
        pieces.insert(2, random.choice(FIRST_NAMES))
    suffix = random.choice(NAME_SUFFIXES)
    if suffix:
        pieces.append(suffix)
    return clean_full_name(" ".join(piece for piece in pieces if piece))


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


def choose_credit_type(segment: str) -> str:
    if segment == "SME":
        return random.choices(CREDIT_TYPES, weights=[0.10, 0.48, 0.08, 0.10, 0.24], k=1)[0]
    if segment == "Priority":
        return random.choices(CREDIT_TYPES, weights=[0.36, 0.14, 0.14, 0.14, 0.22], k=1)[0]
    return random.choices(CREDIT_TYPES, weights=[0.20, 0.08, 0.18, 0.34, 0.20], k=1)[0]


def generate_principal_amount(segment: str, credit_type: str) -> int:
    if credit_type == "Working Capital":
        if segment == "SME":
            return int(random.triangular(200_000_000, 3_000_000_000, 950_000_000))
        if segment == "Priority":
            return int(random.triangular(150_000_000, 1_500_000_000, 500_000_000))
        return int(random.triangular(75_000_000, 600_000_000, 220_000_000))

    if credit_type == "Mortgage":
        if segment == "Priority":
            return int(random.triangular(300_000_000, 2_500_000_000, 1_100_000_000))
        return int(random.triangular(200_000_000, 1_750_000_000, 650_000_000))

    if credit_type == "Auto Loan":
        return int(random.triangular(80_000_000, 650_000_000, 220_000_000))

    if credit_type == "Credit Card":
        if segment == "Priority":
            return int(random.triangular(20_000_000, 250_000_000, 85_000_000))
        return int(random.triangular(5_000_000, 120_000_000, 30_000_000))

    if segment == "Priority":
        return int(random.triangular(30_000_000, 400_000_000, 140_000_000))
    if segment == "SME":
        return int(random.triangular(50_000_000, 750_000_000, 200_000_000))
    return int(random.triangular(15_000_000, 200_000_000, 70_000_000))


def choose_credit_status() -> str:
    return random.choices(CREDIT_STATUSES, weights=[0.79, 0.14, 0.07], k=1)[0]


def generate_interest_rate(credit_type: str, segment: str) -> float:
    if credit_type == "Mortgage":
        base_rate = random.uniform(5.5, 10.5)
    elif credit_type == "Working Capital":
        base_rate = random.uniform(7.5, 13.5)
    elif credit_type == "Auto Loan":
        base_rate = random.uniform(6.0, 11.5)
    elif credit_type == "Credit Card":
        base_rate = random.uniform(18.0, 24.0)
    else:
        base_rate = random.uniform(8.5, 17.5)

    if segment == "Priority":
        base_rate -= 0.6
    elif segment == "SME":
        base_rate += 0.4

    return round(max(base_rate, 4.5), 2)


def choose_collectibility(status: str) -> str:
    if status == "CLOSED":
        return "CURRENT"
    if status == "RESTRUCTURED":
        return random.choices(COLLECTIBILITY_STATUSES, weights=[0.18, 0.42, 0.26, 0.14], k=1)[0]
    return random.choices(COLLECTIBILITY_STATUSES, weights=[0.84, 0.10, 0.04, 0.02], k=1)[0]


def generate_credit_dates(today: date, status: str, credit_type: str) -> tuple[date, date]:
    disbursement_date = random_date(date(2016, 1, 1), today - timedelta(days=30))

    if credit_type == "Mortgage":
        term_days = random.randint(5 * 365, 20 * 365)
    elif credit_type == "Working Capital":
        term_days = random.randint(365, 7 * 365)
    elif credit_type == "Credit Card":
        term_days = random.randint(365, 5 * 365)
    else:
        term_days = random.randint(2 * 365, 8 * 365)

    maturity_date = disbursement_date + timedelta(days=term_days)
    if status == "CLOSED":
        maturity_date = min(maturity_date, today - timedelta(days=random.randint(1, 120)))
    elif maturity_date <= today:
        maturity_date = today + timedelta(days=random.randint(30, 900))

    return disbursement_date, maturity_date


def generate_outstanding_balance(principal_amount: int, status: str, collectibility: str) -> int:
    if status == "CLOSED":
        return int(random.triangular(0, max(1, principal_amount // 25), 0))

    utilization_floor = 0.18
    if collectibility == "SPECIAL_MENTION":
        utilization_floor = 0.25
    elif collectibility == "SUBSTANDARD":
        utilization_floor = 0.32
    elif collectibility == "DOUBTFUL":
        utilization_floor = 0.38

    return int(random.triangular(int(principal_amount * utilization_floor), principal_amount, int(principal_amount * 0.68)))


def generate_customers() -> list[dict[str, str | int]]:
    today = date.today()
    birthday_customer_ids = set(random.sample(range(1, CUSTOMER_COUNT + 1), 8))
    rows: list[dict[str, str | int]] = []

    for customer_id in range(1, CUSTOMER_COUNT + 1):
        birth_date = generate_birth_date(today=today, birthday_this_week=customer_id in birthday_customer_ids)
        join_date = generate_join_date(birth_date=birth_date, today=today)
        rows.append(
            {
                "customer_id": customer_id,
                "full_name": build_full_name(),
                "birth_date": format_date(birth_date),
                "city": choose_city(),
                "segment": choose_segment(),
                "join_date": format_date(join_date),
            }
        )

    return rows


def generate_deposits(customers: list[dict[str, str | int]]) -> list[dict[str, str | int]]:
    today = date.today()
    weights = [customer_sampling_weight(str(record["segment"])) for record in customers]
    near_term_indices = set(random.sample(range(DEPOSIT_COUNT), 12))
    rows: list[dict[str, str | int]] = []

    for offset in range(DEPOSIT_COUNT):
        customer = random.choices(customers, weights=weights, k=1)[0]
        customer_id = int(customer["customer_id"])
        segment = str(customer["segment"])
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
                    generate_maturity_date(today=today, product_type=product_type, near_term=offset in near_term_indices)
                ),
                "branch_code": random.choice(BRANCH_CODES),
                "status": status,
            }
        )

    return rows


def generate_credits(customers: list[dict[str, str | int]]) -> list[dict[str, str | int | float]]:
    today = date.today()
    weights = [customer_sampling_weight(str(record["segment"])) for record in customers]
    rows: list[dict[str, str | int | float]] = []

    for offset in range(CREDIT_COUNT):
        customer = random.choices(customers, weights=weights, k=1)[0]
        customer_id = int(customer["customer_id"])
        segment = str(customer["segment"])
        credit_type = choose_credit_type(segment)
        status = choose_credit_status()
        principal_amount = generate_principal_amount(segment=segment, credit_type=credit_type)
        collectibility = choose_collectibility(status)
        disbursement_date, maturity_date = generate_credit_dates(today=today, status=status, credit_type=credit_type)

        rows.append(
            {
                "credit_id": 5001 + offset,
                "customer_id": customer_id,
                "credit_type": credit_type,
                "principal_amount": principal_amount,
                "outstanding_balance": generate_outstanding_balance(
                    principal_amount=principal_amount,
                    status=status,
                    collectibility=collectibility,
                ),
                "interest_rate": generate_interest_rate(credit_type=credit_type, segment=segment),
                "disbursement_date": format_date(disbursement_date),
                "maturity_date": format_date(maturity_date),
                "collectibility": collectibility,
                "branch_code": random.choice(BRANCH_CODES),
                "status": status,
            }
        )

    return rows


def validate_join(customers: list[dict[str, str | int]], child_rows: list[dict[str, str | int | float]], child_name: str) -> bool:
    customer_ids = {int(row["customer_id"]) for row in customers}
    child_customer_ids = {int(row["customer_id"]) for row in child_rows}
    orphan_ids = sorted(child_customer_ids - customer_ids)
    is_valid = len(orphan_ids) == 0

    print(f"\nJoin validation for {child_name}")
    print(f"- all {child_name}.customer_id values exist in customers.customer_id: {is_valid}")
    print(f"- customers and {child_name} are safe to join on customer_id: {is_valid}")
    if not is_valid:
        print(f"- orphan customer_id values: {orphan_ids}")

    return is_valid


def count_birthdays_this_week(customers: list[dict[str, str | int]]) -> int:
    today = date.today()
    return sum(
        date_in_current_week(datetime.strptime(str(row["birth_date"]), "%Y-%m-%d").date(), today)
        for row in customers
    )


def count_maturing_next_14_days(deposits: list[dict[str, str | int]]) -> int:
    today = date.today()
    end_date = today + timedelta(days=14)
    return sum(
        today <= datetime.strptime(str(row["maturity_date"]), "%Y-%m-%d").date() <= end_date
        for row in deposits
    )


def summarize_credit_quality(credits: list[dict[str, str | int | float]]) -> dict[str, int]:
    return {
        "active_credits": sum(row["status"] == "ACTIVE" for row in credits),
        "restructured_credits": sum(row["status"] == "RESTRUCTURED" for row in credits),
        "closed_credits": sum(row["status"] == "CLOSED" for row in credits),
        "non_current_credits": sum(
            row["collectibility"] in {"SPECIAL_MENTION", "SUBSTANDARD", "DOUBTFUL"} for row in credits
        ),
    }


def write_csv(path: str, rows: list[dict[str, str | int | float]]) -> None:
    fieldnames = list(rows[0].keys())
    with open(path, "w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def print_preview(title: str, rows: list[dict[str, str | int | float]], limit: int = 5) -> None:
    print(f"\n{title} preview")
    for row in rows[:limit]:
        print(row)


def main() -> None:
    random.seed(SEED)

    customers = generate_customers()
    deposits = generate_deposits(customers)
    credits = generate_credits(customers)

    deposits_join_valid = validate_join(customers, deposits, "deposits")
    credits_join_valid = validate_join(customers, credits, "credits")
    if not deposits_join_valid:
        raise ValueError("Generated deposits contain invalid customer_id values.")
    if not credits_join_valid:
        raise ValueError("Generated credits contain invalid customer_id values.")

    write_csv("customers.csv", customers)
    write_csv("deposits.csv", deposits)
    write_csv("credits.csv", credits)

    total_active = sum(row["status"] == "ACTIVE" for row in deposits)
    total_inactive = sum(row["status"] == "INACTIVE" for row in deposits)
    maturing_next_14_days = count_maturing_next_14_days(deposits)
    birthdays_this_week = count_birthdays_this_week(customers)
    credit_quality_metrics = summarize_credit_quality(credits)

    print_preview("customers.csv", customers)
    print_preview("deposits.csv", deposits)
    print_preview("credits.csv", credits)

    print("\nSummary metrics")
    print(f"- total customers: {len(customers)}")
    print(f"- total deposits: {len(deposits)}")
    print(f"- total credits: {len(credits)}")
    print(f"- total active deposits: {total_active}")
    print(f"- total inactive deposits: {total_inactive}")
    print(f"- total deposits maturing in the next 14 days: {maturing_next_14_days}")
    print(f"- total customers with birthdays in the current week: {birthdays_this_week}")
    print(f"- total active credits: {credit_quality_metrics['active_credits']}")
    print(f"- total restructured credits: {credit_quality_metrics['restructured_credits']}")
    print(f"- total closed credits: {credit_quality_metrics['closed_credits']}")
    print(f"- total non-current credits: {credit_quality_metrics['non_current_credits']}")


if __name__ == "__main__":
    main()
