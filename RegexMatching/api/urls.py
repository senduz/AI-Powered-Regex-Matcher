from django.urls import path
from .views import RegexProcessView, ProcessDownloadView

urlpatterns = [
    path('process/',  RegexProcessView.as_view(),   name='process_file'),
    path('download/<uuid:file_id>/', ProcessDownloadView.as_view(), name='process_download'),
]

