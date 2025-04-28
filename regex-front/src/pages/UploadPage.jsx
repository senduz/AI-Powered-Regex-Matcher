import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, TextField, Button, Box, Paper
} from '@mui/material';
import axios from 'axios';

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [desc, setDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async e => {
    e.preventDefault();
    if (!file || !desc.trim()) return;
    setLoading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('natural_language', desc.trim());

    try {
      const { data } = await axios.post(
        'http://localhost:8000/api/process/',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      // assume data = { success: true, table: [...], download_url: '...' }
      navigate('/result', { state: data });
    } catch (err) {
      navigate('/error', { state: { error: err.response?.data?.error || err.message } });
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ fontFamily: 'Open Sans, sans-serif', fontWeight: 700 }} >
          Upload & Describe Operations
        </Typography>
        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Button
            variant="contained"
            component="label"
            sx={{ mb: 2 }}
          >
            Choose CSV/Excel
            <input
              type="file"
              accept=".csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              hidden
              onChange={e => setFile(e.target.files[0])}
            />
          </Button>
          {file && <Typography>{file.name}</Typography>}
          <TextField
            fullWidth
            multiline
            minRows={4}
            label="Tell us in natural language what you would like to change"
            value={desc}
            onChange={e => setDesc(e.target.value)}
            sx={{ mt: 2 }}
          />
          <Button
            type="submit"
            variant="contained"
            fullWidth
            sx={{ mt: 3 }}
            disabled={loading}
          >
            {loading ? 'Processing…' : 'Submit'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}