from __future__ import annotations

import re

INDONESIAN_MARKERS = (
    "berapa",
    "tolong",
    "halo",
    "hai",
    "selamat",
    "bisa",
    "mohon",
    "jumlah",
    "total",
    "data",
    "nasabah",
    "deposito",
    "kredit",
    "makasih",
    "terima kasih",
    "selamat pagi",
    "selamat siang",
    "selamat sore",
    "selamat malam",
    "bantu saya",
    "bisa dibantu",
    "sampai jumpa",
    "selamat tinggal",
    "ya",
)

GREETING_PATTERNS = (
    r"^\s*(halo|hai|hi|hello)\b",
    r"^\s*selamat\s+(pagi|siang|sore|malam)\b",
    r"^\s*apa\s+kabar\b",
    r"^\s*(bisa bantu apa|siapa kamu)\b",
)

ACKNOWLEDGEMENT_PATTERNS = (
    r"\b(makasih|terima kasih|thanks|thank you)\b",
    r"\b(mantap|bagus|keren|sip|oke|ok|baik)\b",
    r"\b(makasih ya|terima kasih ya|thank you ya|thanks ya)\b",
    r"\b(mantap banget|bagus banget|keren banget)\b",
)

FAREWELL_PATTERNS = (
    r"\b(sampai jumpa|dadah|bye|goodbye)\b",
    r"\b(selamat tinggal)\b",
)

DATA_DOMAIN_MARKERS = (
    "nasabah",
    "deposito",
    "deposit",
    "kredit",
    "credit",
    "loan",
    "pinjaman",
    "saldo",
    "balance",
    "outstanding",
    "principal",
    "collectibility",
    "segmen",
    "segment",
    "customer",
    "product",
    "produk",
    "branch",
    "cabang",
    "status",
    "maturity",
    "jatuh tempo",
    "kota",
    "city",
    "jumlah",
    "total",
    "berapa",
    "berapa banyak",
)


def is_indonesian_text(text: str) -> bool:
    lowered = normalize_text(text)
    return any(marker in lowered for marker in INDONESIAN_MARKERS)


def is_greeting_or_smalltalk(text: str) -> bool:
    lowered = normalize_text(text)
    return any(re.search(pattern, lowered) for pattern in GREETING_PATTERNS)


def is_acknowledgement(text: str) -> bool:
    lowered = normalize_text(text)
    return any(re.search(pattern, lowered) for pattern in ACKNOWLEDGEMENT_PATTERNS)


def is_farewell(text: str) -> bool:
    lowered = normalize_text(text)
    return any(re.search(pattern, lowered) for pattern in FAREWELL_PATTERNS)


def looks_like_data_request(text: str) -> bool:
    lowered = normalize_text(text)
    return any(marker in lowered for marker in DATA_DOMAIN_MARKERS)


def normalize_text(text: str) -> str:
    lowered = text.lower().strip()
    lowered = re.sub(r"[!?.,;:]+", " ", lowered)
    return re.sub(r"\s+", " ", lowered)


def build_greeting_answer(question: str) -> str:
    if is_indonesian_text(question):
        return (
            "Selamat datang. Saya Data Analyst Assistant, siap membantu Anda "
            "membaca data nasabah, deposito, dan kredit dengan cara yang lebih sederhana "
            "dan nyaman.\n\n"
            "Kalau mau mulai, Anda bisa tanya hal seperti:\n"
            "1. Berapa total saldo deposito saat ini?\n"
            "2. Berapa total outstanding kredit saat ini?\n"
            "3. Siapa nasabah dengan outstanding kredit tertinggi?"
        )

    return (
        "Hello, it is great to meet you. I am the Data Analyst Assistant, "
        "ready to help you explore customer, deposit, and credit data in a clear and practical way.\n\n"
        "You can start with questions like:\n"
        "1. What is the total deposit balance?\n"
        "2. What is the total outstanding credit?\n"
        "3. Who has the highest outstanding credit balances?"
    )


def build_acknowledgement_answer(question: str) -> str:
    if is_indonesian_text(question):
        return (
            "Sama-sama. Senang bisa membantu. Kalau Anda mau, lanjutkan saja "
            "dengan pertanyaan berikutnya tentang nasabah, deposito, kredit, segmen, atau cabang."
        )

    return (
        "Glad to help. If you want, just continue with the next question about "
        "deposit balances, credit exposure, customers, segments, or branches."
    )


def build_out_of_scope_answer(question: str) -> str:
    if is_indonesian_text(question):
        return (
            "Saya paling cocok membantu pertanyaan yang berhubungan dengan data "
            "nasabah, deposito, dan kredit BNI. Kalau Anda mau, coba tanyakan total saldo "
            "deposito, outstanding kredit, jumlah nasabah per segmen, atau nasabah dengan saldo tertinggi."
        )

    return (
        "I can help with questions related to BNI customer, deposit, and credit data. "
        "You can ask about total deposit balance, total outstanding credit, customer counts by segment, "
        "or customers with the highest balances."
    )


def build_farewell_answer(question: str) -> str:
    if is_indonesian_text(question):
        return (
            "Siap, sampai jumpa. Kalau nanti Anda ingin lanjut membaca data lagi, "
            "saya siap membantu."
        )

    return "See you. If you want to continue exploring the data later, I will be here to help."


def build_processing_fallback_answer(question: str) -> str:
    if is_indonesian_text(question):
        return (
            "Maaf, saya belum bisa memproses pertanyaan itu dengan baik saat ini. "
            "Coba tuliskan pertanyaannya lebih spesifik, misalnya tentang total saldo deposito, "
            "outstanding kredit, jumlah nasabah, segmen, atau cabang."
        )

    return (
        "I am sorry, I could not process that question cleanly just now. "
        "Please try asking in a more specific way, for example about total deposit balance, "
        "outstanding credit, customer counts, segments, or branches."
    )
