import * as Location from "expo-location";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function DriverDashboard() {
  const { driver } = useLocalSearchParams();
  const parsedDriver = driver ? JSON.parse(driver as string) : null;

  const [buses, setBuses] = useState<any[]>([]);
  const [selectedBus, setSelectedBus] = useState<any>(null);
  const [subscription, setSubscription] =
    useState<Location.LocationSubscription | null>(null);

  // fetch buses for this driver's route
  useEffect(() => {
    const fetchBuses = async () => {
      try {
        const res = await fetch(
          `https://public-transport-tracking-server.onrender.com/bus/buses/by-route?route=${parsedDriver?.routeAllocated}`
        );
        const data = await res.json();
        setBuses(data);
      } catch (err) {
        console.error("Failed to fetch buses:", err);
      }
    };
    if (parsedDriver) fetchBuses();
  }, [parsedDriver]);

  // start location tracking
  const startTracking = async (busId: string) => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission denied", "Location permission is required.");
      return;
    }

    setSelectedBus(busId);

    const sub = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 0,
      },
      (location) => {
        const { latitude, longitude, speed } = location.coords;

        fetch(
          "https://public-transport-tracking-server.onrender.com/bus/location",
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              busId,
              lat: latitude,
              lng: longitude,
              speed: speed,
              timestamp: new Date().toISOString(),
            }),
          }
        )
          .then((res) => res.json())
          .then((data) => console.log("Backend response:", data))
          .catch((err) => console.error("Failed to send location:", err));
      }
    );

    setSubscription(sub);
  };

  // stop tracking when unmount
  useEffect(() => {
    return () => {
      if (subscription) subscription.remove();
    };
  }, [subscription]);

  if (!parsedDriver) {
    return (
      <View style={styles.container}>
        <Text>No driver data found</Text>
      </View>
    );
  }

  if (!selectedBus) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Welcome, {parsedDriver.name}</Text>
        <Text>Select your bus (Route: {parsedDriver.routeAllocated})</Text>
        <FlatList
          data={buses}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.busItem}
              onPress={() => startTracking(item._id)}
            >
              <Text>
                {item.busNumber} - {item.route}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tracking bus {selectedBus}...</Text>
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
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
  },
  busItem: {
    padding: 15,
    marginVertical: 5,
    backgroundColor: "#eee",
    borderRadius: 5,
    width: "100%",
  },
});
