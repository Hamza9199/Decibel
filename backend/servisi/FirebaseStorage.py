import requests
import os
from dotenv import load_dotenv
import tempfile
from urllib.parse import quote

load_dotenv()
FIREBASE_BUCKET = os.getenv("FIREBASE_BUCKET")

def upload_file(local_path: str, remote_path: str) -> str:
    """
    Upload file to Firebase Storage using REST API (unauthenticated).
    :param local_path: Path to local file.
    :param remote_path: Path in Firebase Storage (e.g. 'folder/file.jpg').
    :return: Public download URL.
    """
    url = f"https://firebasestorage.googleapis.com/v0/b/{FIREBASE_BUCKET}/o?uploadType=media&name={remote_path}"
    headers = {
        "Content-Type": "application/octet-stream"
    }
    with open(local_path, "rb") as f:
        data = f.read()
    response = requests.post(url, headers=headers, data=data)
    print(response.status_code, response.text)  # Debug
    response.raise_for_status()
    resp_json = response.json()
    # Dohvati token iz odgovora
    token = resp_json.get("downloadTokens") or resp_json.get("token")
    # Encode remote_path za URL
    encoded_path = quote(remote_path, safe='')
    if token:
        return f"https://firebasestorage.googleapis.com/v0/b/{FIREBASE_BUCKET}/o/{encoded_path}?alt=media&token={token}"
    else:
        # fallback na link bez tokena (ako je bucket potpuno javan)
        return f"https://firebasestorage.googleapis.com/v0/b/{FIREBASE_BUCKET}/o/{encoded_path}?alt=media"

def download_file(remote_path: str, local_path: str):
    """
    Download file from Firebase Storage using REST API (unauthenticated).
    :param remote_path: Path in Firebase Storage (e.g. 'folder/file.jpg').
    :param local_path: Path to save file locally.
    """
    url = f"https://firebasestorage.googleapis.com/v0/b/{FIREBASE_BUCKET}/o/{remote_path}?alt=media"
    response = requests.get(url, stream=True)
    response.raise_for_status()
    with open(local_path, "wb") as f:
        for chunk in response.iter_content(chunk_size=8192):
            f.write(chunk)
    return f"https://firebasestorage.googleapis.com/v0/b/{FIREBASE_BUCKET}/o/{remote_path}?alt=media"

def download_file(remote_path: str, local_path: str, id_token: str):
    """
    Download file from Firebase Storage using REST API.
    :param remote_path: Path in Firebase Storage (e.g. 'folder/file.jpg').
    :param local_path: Path to save file locally.
    :param id_token: Firebase user ID token (must be authenticated).
    """
    url = f"https://firebasestorage.googleapis.com/v0/b/{FIREBASE_BUCKET}/o/{remote_path}?alt=media"
    headers = {
        "Authorization": f"Bearer {id_token}"
    }
    response = requests.get(url, headers=headers, stream=True)
    response.raise_for_status()
    with open(local_path, "wb") as f:
        for chunk in response.iter_content(chunk_size=8192):
            f.write(chunk)

async def handle_file_upload(file_audio):
    """
    Handle the audio file upload.
    :param file_audio: The audio file to be uploaded.
    :return: The public URL of the uploaded audio file.
    """
    with tempfile.NamedTemporaryFile(delete=False) as tmp:
        tmp.write(await file_audio.read())
        temp_path = tmp.name
    # Upload the file to Firebase Storage
    remote_path = f"audios/{os.path.basename(temp_path)}"
    return upload_file(temp_path, remote_path)
