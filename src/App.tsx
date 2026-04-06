import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { ChatLoading } from '@/components/chat/chat-loading';
import { useAuth } from '@/hooks/use-auth';
import { ChatPage } from '@/pages/chat-page';
import { LoginPage } from '@/pages/login-page';
import { RegisterPage } from '@/pages/register-page';
import { SettingsPage } from '@/pages/settings-page';

const ProtectedLayout = () => {
  const { user, initialized } = useAuth();
  if (!initialized) {
    return <ChatLoading />;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
};

const PublicAuthLayout = () => {
  const { user, initialized } = useAuth();
  if (!initialized) {
    return <ChatLoading />;
  }
  if (user) {
    return <Navigate to="/chat" replace />;
  }
  return <Outlet />;
};

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route element={<PublicAuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<Navigate to="/chat" replace />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/chat/:conversationId" element={<ChatPage />} />
        <Route path="/usermail/:email" element={<ChatPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/chat" replace />} />
    </Routes>
  </BrowserRouter>
);

export default App;
