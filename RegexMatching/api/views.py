import os, uuid, tempfile, traceback
import pandas as pd
from django.conf import settings
from django.http import FileResponse
from django.urls import reverse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import FileProcessSerializer
from .utils import process_file_with_operations
from .services.processor import DataProcessor
from .services.error_handler import explain_error

LARGE_FILE_THRESHOLD = getattr(settings, "LARGE_FILE_THRESHOLD", 50 * 1024 * 1024)  # 50 MB
CHUNK_SIZE           = getattr(settings, "CHUNK_SIZE",           50_000)
PREVIEW_ROWS         = 100   # rows to return for UI preview on large files

TMP_DIR = os.path.join(tempfile.gettempdir(), "regex_processed_files")
os.makedirs(TMP_DIR, exist_ok=True)


def process_large_csv(file_obj, instruction: str, out_path: str):
    """
    Stream-process a large CSV in chunks, saving the full result to *out_path*.
    Returns (preview_rows_as_df, total_row_count).
    """
    reader   = pd.read_csv(file_obj, chunksize=CHUNK_SIZE, iterator=True)
    first    = next(reader)                                    
    processor = DataProcessor(instruction, first)

    total_rows = 0
    preview_df = None

    for idx, chunk in enumerate([first, *reader]):
        processed = processor.apply_to_chunk(chunk)
        write_mode  = "w" if idx == 0 else "a"
        header_flag = idx == 0
        processed.to_csv(out_path, index=False, header=header_flag, mode=write_mode)

        if preview_df is None:
            preview_df = processed.head(PREVIEW_ROWS)

        total_rows += len(processed)

    return preview_df, total_rows

class RegexProcessView(APIView):
    """
    POST  /api/process/
    ------------------------------------
    • small file  →  JSON { "table": [...] }
    • large file  →  JSON { "download_url": "...", "preview": [...], "row_count": N }
    """

    def post(self, request):
        serializer = FileProcessSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        file_obj    = serializer.validated_data["file"]
        instruction = serializer.validated_data["natural_language"]
        size_bytes  = file_obj.size
        name        = os.path.basename(file_obj.name)

        try:
            # ----------------------------------------------------------------
            # Small-file branch  (≤ 50 MB  or  whatever threshold you set)
            # ----------------------------------------------------------------
            if size_bytes <= LARGE_FILE_THRESHOLD:
                df = process_file_with_operations(file_obj, instruction)
                df = df.replace([float("inf"), float("-inf")], pd.NA).fillna("")
                return Response(
                    {
                        "table": df.to_dict(orient="records"),
                        "row_count": len(df),
                    }
                )

            # ----------------------------------------------------------------
            # Large-file branch  (CSV only)
            # ----------------------------------------------------------------
            if not name.lower().endswith(".csv"):
                raise ValueError("Large-file streaming currently supports only CSV input.")

            # 1. Create a temp file on disk
            file_id   = uuid.uuid4()
            out_path  = os.path.join(TMP_DIR, f"{file_id}.csv")

            # 2. Chunk-process → write full CSV + get preview head()
            preview_df, total_rows = process_large_csv(file_obj, instruction, out_path)

            # 3. Build absolute download URL
            download_url = request.build_absolute_uri(
                reverse("process_download", args=[file_id])
            )

            # 4. Return JSON so the React UI can show a preview + button
            return Response(
                {
                    "download_url": download_url,
                    "preview":      preview_df.to_dict(orient="records"),
                    "row_count":    total_rows,
                },
                status=status.HTTP_202_ACCEPTED,          # 202 = accepted / processing
            )

        except Exception as exc:
            raw_err = "".join(traceback.format_exception_only(type(exc), exc)).strip()

            try:
                user_msg = explain_error(raw_err)
            except Exception:
                user_msg = (
                    "An unexpected error occurred while generating an explanation. "
                    "Please try again later."
                )

            return Response(
                {"error": user_msg, "debug": raw_err},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

class ProcessDownloadView(APIView):
    """
    Sends the completed CSV as an attachment.
    The React frontend simply fetches this URL and pipes the blob to file-saver.
    """

    def get(self, request, file_id):
        path = os.path.join(TMP_DIR, f"{file_id}.csv")
        if not os.path.exists(path):
            return Response({"error": "file not found"}, status=404)

        return FileResponse(
            open(path, "rb"),
            as_attachment=True,
            filename="processed.csv",
        )
