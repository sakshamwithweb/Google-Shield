"use client"
import { useState, useEffect } from "react";

const Actions = () => {
  const [loading, setLoading] = useState(false);
  const [soundLevel, setSoundLevel] = useState(null);
  const [mode, setMode] = useState(false);
  const [currentData, setCurrentData] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [speechToText, setSpeechToText] = useState(null);
  const [currentNotification, setCurrentNotification] = useState([]) 

  const startSoundMonitoring = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const monitorSound = () => {
        analyser.getByteFrequencyData(dataArray);
        const avgVolume = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length;
        setSoundLevel(avgVolume);
        if (avgVolume > 80) {
          if (!isRecording) {
            console.log("High sound level detected:", avgVolume);
            setIsRecording(true)
          }
        }

        if (mode) requestAnimationFrame(monitorSound);
      };
      source.connect(analyser);
      monitorSound();
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  useEffect(() => {
    let timer;

    if (isRecording) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          const recorder = new MediaRecorder(stream);
          setMediaRecorder(recorder);
          let chunks = [];

          recorder.ondataavailable = event => {
            chunks.push(event.data);
          };

          recorder.onstop = async () => {
            const audioBlob = new Blob(chunks, { type: 'audio/wav' });
            const audioFile = new File([audioBlob], 'recording.wav', { type: 'audio/wav' });
            const formData = new FormData();
            formData.append('file', audioFile);  // Use 'file' as the key
            try {
              const response = await fetch('/api/get/speechToText', {
                method: 'POST',
                body: formData,
              });

              if (response.ok) {
                const data = await response.json();
                setSpeechToText(data.transcription);
                return data.transcription;
              } else {
                const errorData = await response.json();
                console.error('Audio upload failed:', errorData);
              }
            } catch (error) {
              console.error('Error uploading audio:', error);
            }
          };

          recorder.start();
          console.log('Recording started');

          timer = setTimeout(() => {
            recorder.stop();
            console.log('Recording stopped automatically after 2 minutes');
            setIsRecording(false);
          }, 5000);
        })
        .catch(error => {
          console.error("Error accessing the microphone:", error);
          setIsRecording(false);
        });
    }

    return () => {
      if (timer) clearTimeout(timer);
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop()
      }
    };
  }, [isRecording]);

  useEffect(() => {
    if (speechToText !== null && currentData !== null) {
      (async () => {
        const req = await fetch('/api/get/sendRequestToAI', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            currentData: currentData,
            speechToText: speechToText
          })
        })
        const res = await req.json()
        console.log(res.response)
        try {
          const arr = JSON.parse(res.response)
          if (arr[0].includes("Advise caution")) {
            console.log("low risk")
            //1st task
            setCurrentNotification(prevState => [
              ...prevState,
              {
                color: "green",
                message: "Just a message that you should be aware.",
              }
            ]);
          } else if (arr[0].includes("Issue a warning")) {
            console.log("medium risk")
            //1st task
            setCurrentNotification(prevState => [
              ...prevState,
              {
                color: "yellow",
                message: "Just a warning that you should be aware.",
              }
            ]);
          }
          else if (arr[0].includes("Alert the user")) {
            console.log("high risk")
            setCurrentNotification(prevState => [
              ...prevState,
              {
                color: "red",
                message: "It seems you are in danger! If not so reload the page.",
              }
            ]);
          }
        } catch (error) {
          if (res.response.includes("false")) {
            console.log("no risk")
          } else {
            console.error(error)
          }
        }
      })()
      console.log(speechToText)
    }
  }, [speechToText])

  useEffect(() => {
    if (currentNotification.length > 0) {
      console.log(currentNotification)
    }
  }, [currentNotification])


  useEffect(() => {
    if (mode) startSoundMonitoring();
  }, [mode]);

  const getLocation = async () => {
    const GPS = () => {
      return new Promise((resolve, reject) => {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const lat = position.coords.latitude;
              const lng = position.coords.longitude;
              resolve({ lat, lng });
            },
            (error) => {
              console.error("GPS error:", error);
              reject(error);
            },
            {
              enableHighAccuracy: true,
              timeout: 5000,
              maximumAge: 0,
            }
          );
        } else {
          reject(new Error("Geolocation not supported"));
        }
      });
    };

    try {
      const gpsLocation = await GPS();
      return gpsLocation;
    } catch (error) {
      console.warn("Falling back to API due to error:", error);
    }

    const req = await fetch("/api/get/location", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!req.ok) {
      console.error("Error fetching location from API:", req.status, req.statusText);
      return null;
    }

    const res = await req.json();
    return res.data;
  };

  const getTime = async () => {
    const req = await fetch("/api/get/time");
    const res = await req.json();
    return res.time;
  };

  const getWeather = async (lat, lng) => {
    const req = await fetch('/api/get/weather', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        latitude: lat,
        longitude: lng
      })
    })
    const res = await req.json()
    return res.data
  }

  const getMotion = async () => {
    return new Promise(async (resolve) => {
      const threshold = {
        walking: 2,
        running: 5,
        driving: 1,
      };

      let lastTimestamp = 0;
      let accelerationData = [];
      const detectionInterval = 1000;

      const requestDeviceMotionPermission = async () => {
        if (typeof DeviceMotionEvent.requestPermission === "function") {
          try {
            const permissionState = await DeviceMotionEvent.requestPermission();
            if (permissionState !== "granted") {
              throw new Error("Permission not granted for DeviceMotion");
            }
            console.log("DeviceMotion permission granted.");
          } catch (error) {
            console.error("DeviceMotion permission request failed:", error);
            resolve(null);
          }
        }
      };

      const analyzeMotion = () => {
        if (accelerationData.length > 0) {
          let avgAcceleration = accelerationData.reduce((sum, val) => sum + val, 0) / accelerationData.length;
          accelerationData = [];

          let motionType;
          if (avgAcceleration > threshold.running) {
            motionType = "Running";
          } else if (avgAcceleration > threshold.walking) {
            motionType = "Walking";
          } else if (avgAcceleration < threshold.driving) {
            motionType = "Driving or Stationary";
          } else {
            motionType = "Stationary";
          }
          return motionType;
        }
        return null;
      };

      const handleDeviceMotion = (event) => {
        const currentTimestamp = Date.now();
        if (currentTimestamp - lastTimestamp > 50) {
          const { x = 0, y = 0, z = 0 } = event.acceleration || {};
          const totalAcceleration = Math.sqrt(x * x + y * y + z * z);
          accelerationData.push(totalAcceleration);
          lastTimestamp = currentTimestamp;
        }
      };

      await requestDeviceMotionPermission();
      window.addEventListener("devicemotion", handleDeviceMotion);

      const motionInterval = setInterval(() => {
        const detectedMotion = analyzeMotion();
        if (detectedMotion) {
          resolve(detectedMotion);
          clearInterval(motionInterval);
          window.removeEventListener("devicemotion", handleDeviceMotion);
        }
      }, detectionInterval);
    });
  };

  const getSafePlace = async (lat, lng) => {
    const req = await fetch("/api/get/safePlaces", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        latitude: lat,
        longitude: lng,
      }),
    });
    const res = await req.json();
    return res.data;
  };

  const gatherData = async () => {
    try {
      setLoading(true);
      const gpsLocation = await getLocation();
      if (!gpsLocation) return;
      const gatheredTime = await getTime();
      const gatheredWeather = await getWeather(gpsLocation.lat, gpsLocation.lng);
      const gatheredMotion = await getMotion();
      const gatheredSafePlaces = await getSafePlace(gpsLocation.lat, gpsLocation.lng);

      const newData = {
        latitude: gpsLocation.lat,
        longitude: gpsLocation.lng,
        time: gatheredTime,
        weather: gatheredWeather,
        motion: gatheredMotion,
        safePlaces: gatheredSafePlaces,
      };
      setCurrentData(newData);
      console.log("Current Data:", newData);
      setLoading(false);
    } catch (error) {
      console.error("Error gathering data:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    let intervalId;
    if (mode) {
      gatherData();
      intervalId = setInterval(gatherData, 30000);
    } else {
      clearInterval(intervalId);
    }
    return () => clearInterval(intervalId);
  }, [mode]);

  const handleClick = () => {
    if (mode) {
      setMode(false);
      setCurrentData(null);
    } else {
      setMode(true);
    }
  };

  const handleClickNotification = (index) => {
    setCurrentNotification(prevState => {
      const newNotifications = [...prevState];
      const notification = newNotifications[index];
      
      // Toggle between showing message and removing the notification
      if (notification.clicked) {
        newNotifications.splice(index, 1); // Remove notification on second click
      } else {
        notification.clicked = true; // Mark the notification as clicked to show message
      }
      return newNotifications;
    });
  };
  

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-8">
      <span className="mb-8 text-lg text-gray-700">
        Sound Level: {soundLevel !== null ? soundLevel : "N/A"}
      </span>
      <button
        onClick={handleClick}
        className="text-6xl mb-1 transition-transform duration-200 transform hover:scale-105"
        disabled={loading}
        aria-label={loading ? "Loading..." : "Start Action"}
      >
        <svg
          width="100"
          height="100"
          viewBox="0 0 100 100"
          xmlns="http://www.w3.org/2000/svg"
          className={`transition-transform duration-200 ${loading ? "animate-spin" : ""}`}
        >
          <circle
            cx="50"
            cy="50"
            r="40"
            stroke={mode ? "green" : loading ? "gray" : "red"}
            strokeWidth="5"
            fill="none"
          />
          <line
            x1="50"
            y1="10"
            x2="50"
            y2="50"
            stroke={mode ? "green" : loading ? "gray" : "red"}
            strokeWidth="5"
          />
        </svg>
      </button>
      <span className="mb-8 text-lg text-gray-700">
        It is {mode ? "on" : loading ? "getting on" : "off"}
      </span>
  
      {/* Notifications Section on the right side of the screen */}
      <div className="fixed right-4 top-1/4 space-y-4">
        {currentNotification.map((notification, index) => (
          <div
            key={index}
            className="flex items-center space-x-2 cursor-pointer"
            onClick={() => handleClickNotification(index)}  // Toggle between circle and message
          >
            {/* Circle with the color */}
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold ${notification.color === 'green' ? 'bg-green-500' : notification.color === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'}`}
              style={{ maxWidth: '80px', maxHeight: '80px' }}
            >
              {/* If the notification is clicked, show the message */}
              {notification.clicked ? (
                <span className="text-xs p-2">{notification.message}</span>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
  
};

export default Actions;