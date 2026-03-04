import { useEffect, useState } from "react";
import "./index.css";
import { supabase } from "./lib/supabase";
import { Auth } from "./components/Auth";
import { Dashboard } from "./components/Dashboard";

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const fetchSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setIsLoggedIn(Boolean(session));
      setIsLoading(false);
    };

    fetchSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(Boolean(session));
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <p className="text-sm text-slate-600">Laen kasutaja infot...</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Auth />;
  }

  return (
    <Dashboard />
  );
}

export default App;
