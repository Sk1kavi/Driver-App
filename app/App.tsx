import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Button, StyleSheet, Text, TextInput, View } from "react-native";

export default function App() {
  const [mobile, setMobile] = useState("");
  const router = useRouter();

  const handleLogin = async () => {
    if (!mobile) {
      Alert.alert("Error", "Please enter mobile number");
      return;
    }

    try {
      const res = await fetch(
        "https://public-transport-tracking-server.onrender.com/drivers/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mobile }),
        }
      );

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Login failed");

      // navigate to dashboard and pass driver object
      router.replace({
        pathname: "/driverDashboard",
        params: { driver: JSON.stringify(data.driver) },
      });
    } catch (err: any) {
      Alert.alert("Login failed", err.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Driver Login</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter Mobile Number"
        value={mobile}
        onChangeText={setMobile}
        keyboardType="phone-pad"
      />
      <Button title="Login" onPress={handleLogin} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    marginBottom: 20,
    borderRadius: 5,
  },
});
