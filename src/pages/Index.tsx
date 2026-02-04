import { Navigate } from 'react-router-dom';

// Redireciona para a landing page (raiz do aplicativo)
const Index = () => {
  return <Navigate to="/" replace />;
};

export default Index;
