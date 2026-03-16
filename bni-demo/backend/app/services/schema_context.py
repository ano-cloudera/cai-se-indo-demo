from __future__ import annotations


def build_database_description() -> str:
    return (
        "Database purpose: This is a banking demo dataset for customer and deposit analytics."
    )


def build_table_descriptions() -> str:
    return """
Table: customers
- Business meaning: customer master/profile data
- Grain: one row per customer
- Columns:
  - customer_id: unique customer identifier
  - full_name: customer full name
  - birth_date: customer date of birth stored as string
  - city: customer city
  - segment: customer segment/category
  - join_date: customer onboarding/join date stored as string

Table: deposits
- Business meaning: customer deposit account data
- Grain: one row per deposit account
- Columns:
  - account_id: unique deposit account identifier
  - customer_id: foreign key to customers.customer_id
  - product_type: deposit product/category
  - balance: deposit balance amount
  - maturity_date: deposit maturity date stored as string
  - branch_code: branch identifier/code
  - status: deposit/account status
""".strip()


def build_relationship_guidance() -> str:
    return """
Relationship guidance:
- Join customers.customer_id = deposits.customer_id
- One customer can have multiple deposit accounts
- customers is the customer dimension/master table
- deposits is the account-level table used for deposit analysis
- Joining customers to deposits can duplicate customer rows because deposits is one-to-many from customers
""".strip()


def build_schema_context() -> str:
    return "\n\n".join(
        (
            build_database_description(),
            build_table_descriptions(),
            build_relationship_guidance(),
        )
    )
