import type { RouteObject } from "react-router-dom";
import UserProfile from "../components/UserProfile/UserProfile";

const groupRoutes: RouteObject[] = [
    {
        path: ':userId/profile',
        element: <UserProfile group={true} />
    }
]

export default groupRoutes;
