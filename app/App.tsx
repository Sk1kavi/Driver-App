import * as Location from "expo-location";
import React, { useEffect, useState } from "react";
import { Alert, Button, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function App() {
  const [tracking, setTracking] = useState(false);
  const [subscription, setSubscription] = useState<Location.LocationSubscription | null>(null);
  const [driver, setDriver] = useState<any>(null);
  const [buses, setBuses] = useState<any[]>([]);
  const [selectedBus, setSelectedBus] = useState<any>(null);

  // 1️⃣ Simulate driver login
  const loginDriver = async (mobileNumber: string) => {
    try {
      const res = await fetch("https://public-transport-tracking-server.onrender.com/drivers/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobileNumber }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Login failed");
      setDriver(data.driver);

      // fetch buses in driver’s route
      const busRes = await fetch(
        `https://public-transport-tracking-server.onrender.com/buses?route=${data.driver.routeAllocated}`
      );
      const busData = await busRes.json();
      setBuses(busData);
    } catch (err: any) {
      Alert.alert("Login error", err.message);
    }
  };

  // 2️⃣ Start location tracking for chosen bus
  const startTracking = async (busId: string) => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission denied", "Location permission is required.");
      return;
    }

    setTracking(true);
    setSelectedBus(busId);

    const sub = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 0,
      },
      (location) => {
        const { latitude, longitude, speed } = location.coords;

        fetch("https://public-transport-tracking-server.onrender.com/bus/location", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            busId,
            lat: latitude,
            lng: longitude,
            speed: speed,
            timestamp: new Date().toISOString(),
          }),
        })
          .then((res) => res.json())
          .then((data) => console.log("Backend response:", data))
          .catch((err) => console.error("Failed to send location:", err));
      }
    );

    setSubscription(sub);
  };

  // 3️⃣ Cleanup on unmount
  useEffect(() => {
    return () => {
      if (subscription) subscription.remove();
    };
  }, [subscription]);

  // 4️⃣ UI
  if (!driver) {
    return (
      <View style={styles.container}>
        <Text>Driver Login</Text>
        <Button title="Login with 9876543210" onPress={() => loginDriver("9876543210")} />
      </View>
    );
  }

  if (!selectedBus) {
    return (
      <View style={styles.container}>
        <Text>Select your bus in route {driver.routeAllocated}</Text>
        <FlatList
          data={buses}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.busItem}
              onPress={() => startTracking(item._id)}
            >
              <Text>{item.busNumber} - {item.route}</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text>
        {tracking
          ? `Tracking bus ${selectedBus}...`
          : "Initializing..."}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  busItem: {
    padding: 15,
    marginVertical: 5,
    backgroundColor: "#eee",
    borderRadius: 5,
  },
});
