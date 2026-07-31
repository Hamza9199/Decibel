import os
from dotenv import load_dotenv
import tempfile
from appwrite.client import Client
from appwrite.services.storage import Storage
from appwrite.input_file import InputFile
from appwrite.id import ID
from typing import TypedDict

load_dotenv()

client = (
    Client()
    .set_endpoint(os.getenv("APPWRITE_ENDPOINT"))
    .set_project(os.getenv("APPWRITE_PROJECT_ID"))
    .set_key(os.getenv("APPWRITE_API_KEY"))
)

storage = Storage(client)

BUCKET_ID = os.getenv("APPWRITE_BUCKET_ID")


class UploadedFile(TypedDict):
    file_id: str
    url: str


def upload_file(local_path: str) -> UploadedFile:
    """
    Upload file to Appwrite Storage.

    remote_path može biti:
    audios/song.mp3
    images/test.jpg
    """

    result = storage.create_file(
        bucket_id=BUCKET_ID,
        file_id=ID.unique(),
        file=InputFile.from_path(local_path)
    )

    return {
        "file_id": result["$id"],
        "url": storage.get_file_view(
            bucket_id=BUCKET_ID,
            file_id=result["$id"]
        )
    }


def download_file(file_id: str, local_path: str):
    """
    Download file from Appwrite Storage.
    """

    response = storage.get_file_download(
        bucket_id=BUCKET_ID,
        file_id=file_id
    )

    with open(local_path, "wb") as f:
        f.write(response)


async def handle_file_upload(file_audio):
    with tempfile.NamedTemporaryFile(delete=False) as tmp:
        tmp.write(await file_audio.read())
        temp_path = tmp.name

    try:
        return upload_file(temp_path)
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


def delete_file(file_id: str):
    storage.delete_file(
        bucket_id=BUCKET_ID,
        file_id=file_id
    )