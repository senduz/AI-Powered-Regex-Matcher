// src/index.js
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

/* ---- Brand palette ---- */
const PRIMARY   = '#CD1C18'; // main red
const SECONDARY = '#FFA896'; // peach
const DARK_RED  = '#9B1313'; // hover / dark variant

/* ---- MUI theme ---- */
const theme = createTheme({
  palette: {
    mode: 'light',
    primary:   { main: PRIMARY, contrastText: '#ffffff' },
    secondary: { main: SECONDARY, contrastText: '#000000' },
    error:     { main: DARK_RED },
    background: {
      default: '#ffcdc3',
      paper:   '#ffded8',          // subtle off-white
    },
  },

  components: {
    /* Buttons ------------------------------------------------------------ */
    MuiButton: {
      styleOverrides: {
        containedPrimary: {
          backgroundColor: PRIMARY,
          '&:hover': { backgroundColor: DARK_RED },
        },
        outlinedPrimary: {
          borderColor: PRIMARY,
          color: PRIMARY,
          '&:hover': {
            backgroundColor: '#fff5f5',
            borderColor: DARK_RED,
            color: DARK_RED,
          },
        },
      },
    },

    /* Table header cells ------------------------------------------------- */
    MuiTableCell: {
      styleOverrides: {
        head: {
          backgroundColor: PRIMARY,
          color: '#fff',
          fontWeight: 600,
        },
      },
    },

    /* TextFields / OutlinedInput ---------------------------------------- */
    MuiOutlinedInput: {
      styleOverrides: {
        notchedOutline: {
          borderColor: PRIMARY,
        },
        root: {
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: DARK_RED,
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: PRIMARY,
            borderWidth: 2,
          },
        },
      },
    },
  },
});

/* ---- Mount app ---- */
const root = createRoot(document.getElementById('root'));
root.render(
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <App />
  </ThemeProvider>
);