class StorageService:
    def save_artifact(self, artifact_name: str, content: bytes) -> str:
        return f"stored://{artifact_name}"

