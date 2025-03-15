import React, {useState, useEffect} from "react";
import {Button, Card, CardContent, TextField, Modal, IconButton} from "@mui/material";
import {ThemeProvider, createTheme} from "@mui/material/styles";
import axios from "axios";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import mqtt from "mqtt";
import Device from "./Device";

const USE_PROXY = false

const WQTT_URL = "https://dash.wqtt.ru"


const CREATE_CONST = (URL) => {
    return (USE_PROXY ? '' : WQTT_URL) + URL
}

const DEVICES_URL = CREATE_CONST("/api/devices");  // Use relative path for devices
export const DEVICE_DETAILS_URL = CREATE_CONST("/api/devices/");  // Use relative path for device details
const BROKER_URL = CREATE_CONST("/api/broker");  // Use relative path for device details
const TYPES_URL = CREATE_CONST("/api/devices/types");



export default function Dashboard() {
    const [devices, setDevices] = useState([]);
    const [client, setClient] = useState(null);
    const [connected, setConnected] = useState(false);
    const [token, setToken] = useState(localStorage.getItem("api_token") || "");
    const [showModal, setShowModal] = useState(!token);
    const [darkMode, setDarkMode] = useState(true);
    const [brokerDetail, setBrokerDetails] = useState(null);
    const [types, setTypes] = useState(null)
    const [handlers, setHandlers] = useState({})

    const theme = createTheme({
        palette: {
            mode: darkMode ? "dark" : "light",
        },
    });

    const handleSaveToken = () => {
        if (token) {
            localStorage.setItem("api_token", token);
            setShowModal(false);
        }
    };

    const fetchDevices = () => {
        try {
            axios.get(DEVICES_URL, {
                headers: {Authorization: `Token ${token}`},
            }).then(response => {
                if (response.data.result === "ok") {
                    const old = response.data.devices
                    const newDevices = Object.keys(old).map(key => ({
                        ...old[key],
                        // topics: {}
                    }));
                    setDevices(newDevices);
                    // fetchDeviceDetails(response.data.devices); // Fetch details for each device
                }
            })

        } catch (error) {
            console.error("Error fetching devices", error);
        }
    };

    const mqtt_subscribe = (topic) => {
        client.subscribe(topic, (err) => {
            if (err) {
                console.error('Subscription failed', err);
            } else {
                console.log(`Subscribed to ${topic}`);
            }
        });
    }

    const onMessage = (topic, message) => {
        try {
            Object.keys(handlers).forEach(key => handlers[key](topic, message.toString()))
        } catch (e) {
            console.log(e);
        }
    }


    useEffect(() => {
        if (brokerDetail) {
            const mqtt_url = `wss://${brokerDetail.server}:${brokerDetail.websocket}`
            console.log(brokerDetail.user, brokerDetail.password, mqtt_url)
            const mqttClient = mqtt.connect(mqtt_url, {
                username: brokerDetail.user,
                password: brokerDetail.password,
                protocolId: 'MQIsdp',
                protocolVersion: 3
            });

            mqttClient.on('connect', () => {
                console.log('Connected to MQTT broker');
                setConnected(true);
            });

            mqttClient.on('message', onMessage);
            setClient(mqttClient);

            // return () => {
            // if (mqttClient) {
            //     mqttClient.end();
            // }
            // };
        }
    }, [brokerDetail])

    const fetchBroker = () => {
        try {
            axios.get(BROKER_URL, {
                headers: {Authorization: `Token ${token}`},
            }).then(response => {
                // console.log(response.data)
                if (response.data) {
                    setBrokerDetails(response.data)
                    console.log(response.data)
                }
            })

        } catch (error) {
            console.error("Error fetching broker details", error);
        }
    };

    const fetchTypes = () => {
        try {
            axios.get(TYPES_URL, {
                headers: {Authorization: `Token ${token}`},
            }).then(response => {
                if (response.data) {
                    setTypes(response.data.types)
                    console.log(response.data.types)
                }
            })

        } catch (error) {
            console.error("Error fetching broker details", error);
        }
    };

    useEffect(() => {
        if (token) {
            fetchBroker();
            fetchTypes();
            fetchDevices();
        }
    }, [token]);

    const append_mqtt_message_handler = (id, handler) => {
        handlers[id] = handler
        setHandlers(handlers)
    }

    const mqtt_publish = (topic, message, retain = false) => {
        if (client && connected) {
            client.publish(topic, message, {retain}, () => {
                console.log(`Message "${message}" sent to ${topic} with retain=${retain}`);
            });
        }
    };

    return (
        <ThemeProvider theme={theme}>
            <div style={{
                padding: "16px",
                minHeight: "100vh",
                backgroundColor: theme.palette.background.default,
                color: theme.palette.text.primary
            }}>
                <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                    <h1>MQTT Devices</h1>
                    <IconButton onClick={() => setDarkMode(!darkMode)}>
                        {darkMode ? <LightModeIcon/> : <DarkModeIcon/>}
                    </IconButton>
                </div>
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
                    gap: "16px"
                }}>
                    {devices.map((device) => (
                        <Device key={device.id} device={device} token={token} types={types}
                                mqtt_subscribe={mqtt_subscribe}
                                append_mqtt_message_handler={append_mqtt_message_handler} mqtt_publish={mqtt_publish}/>
                    ))}
                </div>

                <Modal open={showModal} onClose={() => setShowModal(false)}>
                    <div style={{
                        padding: "16px",
                        backgroundColor: "white",
                        margin: "auto",
                        width: "300px",
                        marginTop: "20vh",
                        borderRadius: "8px"
                    }}>
                        <h2>Enter API Token</h2>
                        <TextField
                            fullWidth
                            variant="outlined"
                            value={token}
                            onChange={(e) => setToken(e.target.value)}
                            margin="normal"
                        />
                        <Button variant="contained" color="primary" onClick={handleSaveToken} fullWidth>
                            Save
                        </Button>
                    </div>
                </Modal>
            </div>
        </ThemeProvider>
    );
}
