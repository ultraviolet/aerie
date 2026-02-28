import { useState } from "react";
import { api } from "@/api";
import { useAuth } from "@/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AuthPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (mode: "login" | "register") => {
    if (!username.trim() || !password) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res =
        mode === "login"
          ? await api.login(username.trim(), password)
          : await api.register(username.trim(), password);
      login(res.token, res.user);
    } catch (e) {
      const msg = String(e);
      if (msg.includes("409")) {
        setError("Username already taken.");
      } else if (msg.includes("401")) {
        setError("Invalid username or password.");
      } else {
        setError("Something went wrong. Is the server running?");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <img
            src="/Gemini_Generated_Image_ps4wo3ps4wo3ps4w-removebg-preview.png"
            alt="aerie"
            className="mx-auto h-14"
          />
          <CardDescription>AI-powered self-study platform</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">log in</TabsTrigger>
              <TabsTrigger value="register">sign up</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Input
                  id="login-user"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit("login")}
                  placeholder="username"
                  autoComplete="username"
                />
              </div>
              <div className="space-y-2">
                <Input
                  id="login-pass"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit("login")}
                  placeholder="password"
                  autoComplete="current-password"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                className="w-full"
                onClick={() => handleSubmit("login")}
                disabled={loading}
              >
                {loading ? "logging in..." : "log in"}
              </Button>
            </TabsContent>

            <TabsContent value="register" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Input
                  id="reg-user"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && handleSubmit("register")
                  }
                  placeholder="choose a username"
                  autoComplete="username"
                />
              </div>
              <div className="space-y-2">
                <Input
                  id="reg-pass"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && handleSubmit("register")
                  }
                  placeholder="choose a password"
                  autoComplete="new-password"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                className="w-full"
                onClick={() => handleSubmit("register")}
                disabled={loading}
              >
                {loading ? "creating account..." : "sign up"}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
