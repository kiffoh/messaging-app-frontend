import LogIn from "./components/LogIn/LoginForm";
import useAuth from './authentication/useAuth'
import App from "./App";
import { SocketProvider } from "./socketContext/socketContext";

function Home() {
    const { user, loading } = useAuth();

    if (loading) return <h1>Loading...</h1>;

    return user ? (
        <SocketProvider>
            <App />
        </SocketProvider>
    ) : <LogIn />;
}

export default Home;
