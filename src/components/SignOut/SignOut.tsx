import { useEffect } from "react";
import useAuth from "../../authentication/useAuth";
import { useNavigate } from "react-router-dom";

function SignOut() {
    const { signOut } = useAuth();
    const navigate = useNavigate();

    // TODO(refactor F10/F18): how often does this run, and what does it call each time?
    useEffect(() => {
        signOut();
        navigate('/');
    });

    return null;
}

export default SignOut;
