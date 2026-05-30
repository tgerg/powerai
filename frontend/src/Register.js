import { useState } from "react";
import axios from "axios";

export default function Register({ onRegister }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = async () => {
    await axios.post("/auth/register", { email, password });
    
    // Auto-login after register so there's a token before dashboard loads
    const res = await axios.post("/auth/login", { email, password });
    localStorage.setItem("token", res.data.token);
    
    onRegister();
};

  return (
    <div style={{ padding: 40 }}>
      <h2>Register</h2>

      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      /><br/><br/>

      <input
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      /><br/><br/>

      <button onClick={submit}>Create Account</button>
    </div>
  );
}
