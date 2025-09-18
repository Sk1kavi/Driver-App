import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

export default function App() {
  const [mobile, setMobile] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
        easing: Easing.out(Easing.exp),
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        friction: 6,
      }),
    ]).start();
  }, []);

  const handleLogin = async () => {
    if (!mobile) {
      Alert.alert("Error", "Please enter mobile number");
      return;
    }
    setLoading(true);
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

      router.replace({
        pathname: "/driverDashboard",
        params: { driver: JSON.stringify(data.driver) },
      });
    } catch (err: any) {
      Alert.alert("Login failed", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#f6f8fa" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.headerContainer}>
        <Animated.Text
          style={[
            styles.title,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          🚍 Driver Login
        </Animated.Text>
      </View>
      <Animated.View
        style={[
          styles.container,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <Text style={styles.label}>Mobile Number</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter Mobile Number"
          value={mobile}
          onChangeText={setMobile}
          keyboardType="phone-pad"
          maxLength={10}
          placeholderTextColor="#b0b8c1"
        />
        <TouchableOpacity
          style={[
            styles.button,
            loading ? styles.buttonDisabled : {},
          ]}
          onPress={handleLogin}
          activeOpacity={0.8}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Logging in..." : "Login"}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flex: 0.4,
    justifyContent: "flex-end",
    alignItems: "center",
    backgroundColor: "#2563eb",
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  container: {
    flex: 0.6,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    marginTop: -40,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 16,
    letterSpacing: 1,
    textShadowColor: "#1e40af",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  label: {
    alignSelf: "flex-start",
    fontSize: 16,
    color: "#1e293b",
    marginBottom: 8,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#fff",
    padding: 14,
    marginBottom: 24,
    borderRadius: 10,
    fontSize: 16,
    color: "#1e293b",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  button: {
    width: "100%",
    backgroundColor: "#2563eb",
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: "center",
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: "#93c5fd",
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: 1,
  },
});
