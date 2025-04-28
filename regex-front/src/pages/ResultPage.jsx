import React, {
    useState,
    useMemo,
    useEffect,
    useRef,
  } from 'react';
  import { useLocation, useNavigate } from 'react-router-dom';
  import axios from 'axios';
  import { saveAs } from 'file-saver';
  import {
    Container,
    Box,
    Paper,
    Typography,
    Button,
    TableCell,
    TextField,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    IconButton,
    Backdrop,
    CircularProgress,
  } from '@mui/material';
  import CloseIcon from '@mui/icons-material/Close';
  import { FixedSizeList as List } from 'react-window';
  
  export default function ResultPage() {
    /* ----------------------------- routing -------------------------------- */
    const location         = useLocation();
    const navigate         = useNavigate();
    const state            = location.state;
  
    /* --------------- hooks & refs (always called) ------------------------- */
    const outerRef         = useRef(null);
    const [containerWidth, setContainerWidth] = useState(() => window.innerWidth - 32);
    const [dialogOpen,     setDialogOpen]    = useState(false);
    const [dialogRow,      setDialogRow]     = useState({});
    const [newInstr,       setNewInstr]      = useState('');
    const [busy,           setBusy]          = useState(false);
  
    /* ------------------------ locate table & URL -------------------------- */
    const safeFindArray = (obj) => {
      if (!obj || typeof obj !== 'object') return [];
      if (Array.isArray(obj.table)) return obj.table;
      if (Array.isArray(obj.data))  return obj.data;
      for (const k of Object.keys(obj).slice(0, 10_000)) {
        if (Array.isArray(obj[k])) return obj[k];
      }
      return [];
    };
  
    const { table, downloadUrl } = useMemo(() => {
      if (!state) return { table: [], downloadUrl: null };
      if (Array.isArray(state)) return { table: state, downloadUrl: null };
      return {
        table: safeFindArray(state),
        downloadUrl:
          state.download_url ??
          state.downloadUrl ??
          state.file_url ??
          state.url ??
          null,
      };
    }, [state]);
  
    /* ----------------------- column calculations -------------------------- */
    const { columns, fullColumns } = useMemo(() => {
      const base = table.length ? Object.keys(table[0]) : [];
      if (base.length <= 200) return { columns: base, fullColumns: base };
      return {
        columns: [...base.slice(0, 100), '__ellipsis__', ...base.slice(-100)],
        fullColumns: base,
      };
    }, [table]);
  
    /* ----------------------- responsive sizing ---------------------------- */
    useEffect(() => {
      const handleResize = () => {
        const w = outerRef.current ? outerRef.current.clientWidth : window.innerWidth - 32;
        setContainerWidth(w);
      };
      handleResize();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, []);
  
    const visibleCount = Math.min(columns.length, 6) || 1;
    const columnWidth  = containerWidth / visibleCount;
    const totalWidth   = columnWidth * columns.length;
    const rowHeight    = 40;
    const headerHeight = 48;
    const listHeight   = window.innerHeight - 250 - headerHeight; // 250 ≈ margins & controls
  
    /* ----------------------------- helpers -------------------------------- */
    const truncateHeader = (s) =>
      s.length <= 15 ? s : `${s.slice(0, 6)}...${s.slice(-6)}`;
    const truncateCell = (v, max = 50) => {
      const str = String(v ?? '');
      if (str.length <= max) return str;
      const keep = Math.floor((max - 3) / 2);
      return `${str.slice(0, keep)}...${str.slice(-keep)}`;
    };
  
    const openRowDialog  = (row) => { setDialogRow(row); setDialogOpen(true); };
    const closeRowDialog = ()   =>  setDialogOpen(false);
  
    const downloadCsv = async () => {
      try {
        if (downloadUrl) {
          const res  = await fetch(downloadUrl);
          const blob = await res.blob();
          saveAs(blob, 'processed.csv');
          return;
        }
        const csv =
          [fullColumns.join(',')]
            .concat(
              table.map((r) =>
                fullColumns
                  .map((c) => `"${String(r[c] ?? '').replace(/"/g, '""')}"`)
                  .join(',')
              )
            )
            .join('\n');
        saveAs(new Blob([csv], { type: 'text/csv;charset=utf-8' }), 'processed.csv');
      } catch (err) {
        alert('Download failed: ' + err.message);
      }
    };
  
    const buildCsvFile = async () => {
      if (downloadUrl) {
        const res  = await fetch(downloadUrl);
        const blob = await res.blob();
        return new File([blob], 'reprocess.csv', { type: 'text/csv' });
      }
      const csv =
        [fullColumns.join(',')]
          .concat(
            table.map((r) =>
              fullColumns
                .map((c) => `"${String(r[c] ?? '').replace(/"/g, '""')}"`)
                .join(',')
            )
          )
          .join('\n');
      return new File([csv], 'reprocess.csv', { type: 'text/csv' });
    };
  
    const handleReprocess = async () => {
      if (!newInstr.trim()) return;
      setBusy(true);
      try {
        const file = await buildCsvFile();
        const form = new FormData();
        form.append('file', file);
        form.append('natural_language', newInstr.trim());
  
        const { data } = await axios.post(
          'http://localhost:8000/api/process/',
          form,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );
  
        navigate('/result', { state: data });
      } catch (err) {
        alert('Re-processing failed: ' + (err.response?.data?.error || err.message));
      } finally {
        setBusy(false);   // always clear spinner
      }
    };
  
    /* ------------------- react-window row renderer ------------------------ */
    const Row = ({ index, style }) => {
      const row = table[index];
      return (
        <Box style={{ ...style, width: totalWidth }}>
          <Box sx={{ display: 'flex' }}>
            {columns.map((col) =>
              col === '__ellipsis__' ? (
                <TableCell
                  key="ellipsis"
                  sx={{
                    flex: `0 0 ${columnWidth}px`,
                    textAlign: 'center',
                    borderBottom: '1px solid #eee',
                  }}
                >
                  …
                </TableCell>
              ) : (
                <TableCell
                  key={col}
                  onDoubleClick={() => openRowDialog(row)}
                  sx={{
                    flex: `0 0 ${columnWidth}px`,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    cursor: 'pointer',
                    borderBottom: '1px solid #eee',
                  }}
                >
                  {truncateCell(row[col])}
                </TableCell>
              )
            )}
          </Box>
        </Box>
      );
    };
  
    /* ---------------------------- content cases --------------------------- */
    let content;
  
    if (!table.length && downloadUrl) {
      content = (
        <Container sx={{ mt: 6, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            Your large file is ready for download.
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 3 }}>
            <Button variant="contained" onClick={() => window.open(downloadUrl, '_blank')}>
              Download CSV
            </Button>
            <Button variant="outlined" onClick={() => navigate('/')}>
              Go Home
            </Button>
          </Box>
        </Container>
      );
    } else if (!table.length) {
      content = (
        <Container sx={{ mt: 6, textAlign: 'center' }}>
          <Typography>No data array detected in server response.</Typography>
          <Button sx={{ mt: 2 }} onClick={() => navigate('/')}>
            Go Home
          </Button>
        </Container>
      );
    } else {
      content = (
        <>
          {/* busy overlay */}
          <Backdrop open={busy} sx={{ zIndex: 1200 }}>
            <CircularProgress color="inherit" />
          </Backdrop>
  
          {/* header bar */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">Processed Data Preview</Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button variant="outlined" onClick={downloadCsv}>
                Download CSV
              </Button>
              <Button variant="outlined" onClick={() => navigate('/')}>
                Go Home
              </Button>
            </Box>
          </Box>
  
          {/* table */}
          <Paper sx={{ height: window.innerHeight - 250, overflow: 'hidden' }}>
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              {/* sticky header */}
              <Box sx={{ overflowX: 'auto' }}>
                <Box
                  sx={{
                    display: 'flex',
                    width: totalWidth,
                    borderBottom: '1px solid #ccc',
                    backgroundColor: 'primary.main',
                    color: 'primary.contrastText',
                  }}
                >
                  {columns.map((col) =>
                    col === '__ellipsis__' ? (
                      <TableCell
                        key="ellipsis_h"
                        sx={{
                          flex: `0 0 ${columnWidth}px`,
                          textAlign: 'center',
                          fontWeight: 'bold',
                        }}
                      >
                        …
                      </TableCell>
                    ) : (
                      <TableCell
                        key={col}
                        sx={{
                          flex: `0 0 ${columnWidth}px`,
                          fontWeight: 'bold',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {truncateHeader(col)}
                      </TableCell>
                    )
                  )}
                </Box>
              </Box>
  
              {/* rows */}
              <Box sx={{ overflow: 'hidden', flex: 1 }}>
                <List
                  height={listHeight}
                  itemCount={table.length}
                  itemSize={rowHeight}
                  width={totalWidth}
                >
                  {Row}
                </List>
              </Box>
            </Box>
          </Paper>
  
          {/* re-process UI */}
          <Paper sx={{ p: 2, mt: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Refine further – enter a new instruction and re-process:
            </Typography>
            <TextField
              fullWidth
              multiline
              minRows={3}
              label="New natural-language instruction"
              value={newInstr}
              onChange={(e) => setNewInstr(e.target.value)}
            />
            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <Button
                variant="contained"
                disabled={!newInstr.trim() || busy}
                onClick={handleReprocess}
              >
                Re-process
              </Button>
              <Button variant="outlined" onClick={() => navigate('/')}>
                Go Home
              </Button>
            </Box>
          </Paper>
  
          {/* row dialog */}
          <Dialog open={dialogOpen} onClose={closeRowDialog} maxWidth="md" fullWidth>
            <DialogTitle>
              Observation Details
              <IconButton
                aria-label="close"
                onClick={closeRowDialog}
                sx={{ position: 'absolute', right: 8, top: 8 }}
              >
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers>
              <DialogContentText component="div">
                {fullColumns.map((col) => (
                  <Box key={col} sx={{ mb: 1 }}>
                    <strong>{col}: </strong>
                    {String(dialogRow[col] ?? '')}
                  </Box>
                ))}
              </DialogContentText>
            </DialogContent>
          </Dialog>
        </>
      );
    }
  
    /* ----------------------------- render --------------------------------- */
    return (
      <Container ref={outerRef} sx={{ mt: 4 }}>
        {content}
      </Container>
    );
  }
  