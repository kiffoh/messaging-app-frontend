import { useEffect } from "react";
import useAuth from "../../authentication/useAuth";
import { useNavigate } from "react-router-dom";

function SignOut() {
    const { signOut } = useAuth();
    const navigate = useNavigate();

    // TODO(refactor F10/F18): no dependency array, so this runs after every render.
    useEffect(() => {
        signOut();
        navigate('/');
    });

    return null;
}

export default SignOut;
