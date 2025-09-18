import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { useLocalSearchParams } from 'expo-router';
import * as TaskManager from 'expo-task-manager';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const LOCATION_TASK_NAME = 'BACKGROUND_LOCATION_TASK';

export default function DriverDashboard() {
  const { driver } = useLocalSearchParams();
  const parsedDriver = driver ? JSON.parse(driver as string) : null;

  const [buses, setBuses] = useState<any[]>([]);
  const [selectedBus, setSelectedBus] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentSpeed, setCurrentSpeed] = useState<number>(0);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Fetch buses
  useEffect(() => {
    const fetchBuses = async () => {
      try {
        const res = await fetch(
          `https://public-transport-tracking-server.onrender.com/bus/buses/by-route?route=${parsedDriver?.routeAllocated}`
        );
        const data = await res.json();
        setBuses(data);
        setLoading(false);

        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      } catch (err) {
        console.error('Failed to fetch buses:', err);
        setLoading(false);
      }
    };
    if (parsedDriver) fetchBuses();
  }, [parsedDriver]);

  // Foreground tracking (works in Expo Go)
  const startForegroundTracking = async (bus: any) => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Location permission is required.');
      return;
    }

    setSelectedBus(bus);

    const sub = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 0,
      },
      async (location) => {
        const { latitude, longitude, speed } = location.coords;
  setCurrentSpeed(speed != null ? speed * 3.6 : 0); 
        // send to backend
        try {
          await fetch('https://public-transport-tracking-server.onrender.com/bus/location', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              busId: bus._id,
              lat: latitude,
              lng: longitude,
              speed: speed??0,
              timestamp: new Date().toISOString(),
            }),
          });
        } catch (err) {
          console.error('Failed to send location:', err);
        }
      }
    );

    setSubscription(sub);
  };

  // Background tracking (works only in dev-client / standalone build)
  const startBackgroundTracking = async (bus: any) => {
    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();

    if (fgStatus !== 'granted' || bgStatus !== 'granted') {
      Alert.alert('Permission denied', 'Foreground & background location permissions are required.');
      return;
    }

    setSelectedBus(bus);
    await AsyncStorage.setItem('trackingBusId', bus._id);

    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.High,
      timeInterval: 5000,
      distanceInterval: 0,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'Bus Tracker',
        notificationBody: `Tracking bus ${bus.busCode}`,
        notificationColor: '#1E90FF',
      },
    });
  };

  // Start tracking (choose foreground or background depending on platform & environment)
  const startTracking = async (bus: any) => {
    if (Platform.OS === 'android' && Constants.appOwnership === 'expo') {
      // Expo Go on Android → foreground only
      startForegroundTracking(bus);
    } else {
      // iOS or dev-client → background tracking
      startBackgroundTracking(bus);
      // Also start foreground tracking to update speed live
      startForegroundTracking(bus);
    }
  };

  // Stop tracking
  const stopTracking = async () => {
    if (subscription) {
      subscription.remove();
      setSubscription(null);
    }
    setSelectedBus(null);
    setCurrentSpeed(0);
    await AsyncStorage.removeItem('trackingBusId');
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  };

  if (!parsedDriver) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.title}>No driver data found</Text>
      </View>
    );
  }

  if (!selectedBus) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Welcome, {parsedDriver.name}</Text>
        <Text style={styles.subtitle}>
          Select your bus (Route: {parsedDriver.routeAllocated})
        </Text>
        {loading ? (
          <ActivityIndicator size="large" color="#1E90FF" style={{ marginTop: 30 }} />
        ) : buses.length === 0 ? (
          <Text style={styles.subtitle}>No buses available for your route.</Text>
        ) : (
          <Animated.View style={{ flex: 1, opacity: fadeAnim, width: '100%' }}>
            <FlatList
              data={buses}
              keyExtractor={(item) => item._id}
              contentContainerStyle={{ paddingVertical: 10 }}
              renderItem={({ item }) => <BusCard bus={item} onPress={startTracking} />}
            />
          </Animated.View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.centeredContainer}>
      <Text style={styles.title}>
        Tracking bus {selectedBus.busCode} ({selectedBus.routeName})
      </Text>
      <Text style={styles.subtitle}>Current speed: {currentSpeed.toFixed(1)} km/h</Text>

      <ActivityIndicator size="large" color="#1E90FF" style={{ marginTop: 20 }} />

      <TouchableOpacity style={styles.stopButton} onPress={stopTracking}>
        <Text style={styles.stopButtonText}>Stop Tracking</Text>
      </TouchableOpacity>
    </View>
  );
}

// BusCard component
const BusCard = ({ bus, onPress }: any) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 3, useNativeDriver: true }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], marginVertical: 8 }}>
      <TouchableOpacity
        activeOpacity={0.8}
        style={styles.busItem}
        onPress={() => onPress(bus)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Text style={styles.busText}>
          {bus.busCode} - {bus.routeName}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Background location task
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }
  if (data) {
    const { locations } = data as any;
    const location = locations[0];
    if (location) {
      const { latitude, longitude, speed } = location.coords;
      const busId = await AsyncStorage.getItem('trackingBusId');
      if (!busId) return;

      try {
        await fetch('https://public-transport-tracking-server.onrender.com/bus/location', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            busId,
            lat: latitude,
            lng: longitude,
            speed: speed??0,
            timestamp: new Date().toISOString(),
          }),
        });
      } catch (err) {
        console.error('Failed to send location in background:', err);
      }
    }
  }
});

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#F5F7FA' },
  centeredContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F7FA', padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 10, color: '#1E90FF' },
  subtitle: { fontSize: 16, color: '#333', marginBottom: 20 },
  busItem: {
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  busText: { fontSize: 16, fontWeight: '500', color: '#333' },
  stopButton: {
    marginTop: 30,
    paddingVertical: 12,
    paddingHorizontal: 25,
    backgroundColor: '#FF4D4D',
    borderRadius: 10,
  },
  stopButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
