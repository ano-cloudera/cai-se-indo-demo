from __future__ import annotations


def build_supported_question_examples() -> str:
    return """
Supported business question patterns include:
- total deposit balance by city
- total outstanding credit by city
- top customers by balance
- top customers by outstanding credit
- customer count by segment
- balances by product type
- credit exposure by collectibility
- balances by branch
- active vs non-active deposit counts
- active vs restructured credit counts
- maturity analysis
- customer onboarding trends
- customer cross-holding between deposits and credits
""".strip()


def build_ambiguity_guidance() -> str:
    return """
Interpretation guidance:
- Prefer the safest reasonable interpretation of ambiguous questions.
- Do not invent values that are not present in the schema.
- Use grouping and aggregation for summary questions.
- Use joins only when needed to answer the question.
- If a question is broad, return a practical preview query.
- If a question asks for customer-level analysis, start from customers unless deposit data is required.
- If a question asks for balance, product, maturity, branch, or account status analysis, deposits is usually required.
- If a question asks about credit, loans, outstanding balance, principal, collectibility, or interest rate, credits is usually required.
- If a question asks for both deposit and credit metrics in one result, consider pre-aggregating each table by customer before joining.
""".strip()


def build_business_context() -> str:
    return "\n\n".join(
        (
            "Business context: The dataset represents a banking customer, deposit, and credit analytics demo.",
            build_supported_question_examples(),
            build_ambiguity_guidance(),
        )
    )
