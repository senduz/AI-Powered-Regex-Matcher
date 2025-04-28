from rest_framework import serializers

class FileProcessSerializer(serializers.Serializer):
    file = serializers.FileField()
    natural_language = serializers.CharField(max_length=500)