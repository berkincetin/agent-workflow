import React, { useState, useContext } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  Typography, 
  Paper, 
  Tabs, 
  Tab, 
  Container 
} from '@mui/material';
import { AppContext } from '../../contexts/AppContext';

const AuthForm: React.FC = () => {
  const { login, register } = useContext(AppContext);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ email: '', password: '', full_name: '' });

  const handleLogin = async () => {
    if (loginForm.email && loginForm.password) {
      await login(loginForm.email, loginForm.password);
    }
  };

  const handleRegister = async () => {
    if (registerForm.email && registerForm.password && registerForm.full_name) {
      await register(registerForm.email, registerForm.password, registerForm.full_name);
      setAuthMode('login');
      setLoginForm({
        email: registerForm.email,
        password: ''
      });
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography component="h1" variant="h4" sx={{ mb: 4 }}>
          İş Akışı Yönetim Sistemi
        </Typography>
        
        <Paper sx={{ width: '100%', p: 3 }}>
          <Tabs
            value={authMode}
            onChange={(e, newValue) => setAuthMode(newValue)}
            indicatorColor="primary"
            textColor="primary"
            centered
            sx={{ mb: 3 }}
          >
            <Tab label="Giriş" value="login" />
            <Tab label="Kayıt Ol" value="register" />
          </Tabs>

          {authMode === 'login' ? (
            <Box component="form" noValidate>
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Email Adresi"
                name="email"
                autoComplete="email"
                autoFocus
                value={loginForm.email}
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Şifre"
                type="password"
                id="password"
                autoComplete="current-password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
              />
              <Button
                type="button"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                onClick={handleLogin}
              >
                Giriş Yap
              </Button>
            </Box>
          ) : (
            <Box component="form" noValidate>
              <TextField
                margin="normal"
                required
                fullWidth
                id="full_name"
                label="Ad Soyad"
                name="full_name"
                autoComplete="name"
                autoFocus
                value={registerForm.full_name}
                onChange={(e) => setRegisterForm({ ...registerForm, full_name: e.target.value })}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Email Adresi"
                name="email"
                autoComplete="email"
                value={registerForm.email}
                onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Şifre"
                type="password"
                id="password"
                autoComplete="new-password"
                value={registerForm.password}
                onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
              />
              <Button
                type="button"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                onClick={handleRegister}
              >
                Kayıt Ol
              </Button>
            </Box>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default AuthForm; 