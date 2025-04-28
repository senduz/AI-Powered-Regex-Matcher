import { useLocation, useNavigate } from 'react-router-dom';
import { Container, Paper, Typography, Button } from '@mui/material';

export default function ErrorPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const msg = state?.error || 'Unknown error';

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4, bgcolor: '#ffebee' }}>
        <Typography variant="h6" color="error" gutterBottom>
          Something went wrong
        </Typography>
        <Typography>{msg}</Typography>
        <Button sx={{ mt: 3 }} onClick={() => navigate('/')}>
          Go Back
        </Button>
      </Paper>
    </Container>
  );
}