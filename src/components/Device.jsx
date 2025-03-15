import { Card, CardContent, Typography, TextField, Button, Box } from "@mui/material";
import React, {useEffect, useState} from "react";
import axios from "axios";
import {DEVICE_DETAILS_URL} from "./Dashboard";

export const TYPES_UNITS = {
    20: 'm³',
    18: 'm³',
    17: 'kW',
    0: '°C',
    1: '%',
    2: 'PPM'
}

export default function Device({device, token, types, mqtt_subscribe, append_mqtt_message_handler, mqtt_publish}) {
    // console.log(device)
    const [details, setDetails] = useState(null)
    const [topics, setTopics] = useState({})
    const [message, setMessage] = useState('')
    const {id, type, room, name} = device

    const message_handler = (topic, message) => {

        if (topics.hasOwnProperty(topic)) {
            console.log(topic, message)
            topics[topic].value = message
            setTopics({...topics})
        }
    }

    useEffect(() => {
        append_mqtt_message_handler(id, message_handler)
        try {
            axios.get(`${DEVICE_DETAILS_URL}${id}`, {
                headers: {Authorization: `Token ${token}`},
            }).then((response) => {
                if (response.data.result === "ok") {
                    setDetails(response.data.device); // Return device details
                }
            }).catch((error) => {
                console.error(`Error fetching details for device ${id}`, error);
            })
        } catch (error) {
            console.error("Error fetching device details", error);
        }
    }, [])

    useEffect(() => {
        if (details) {
            // console.log(details)
            details.sensors_float?.forEach(topic_el => {
                console.log(topic_el)
                topics[topic_el.topic] = {
                    device_id: id,
                    type: topic_el.type,
                    value: ''
                }
                mqtt_subscribe(topic_el.topic)
            })
            setTopics(topics)
        }
    }, [details])

    const handle_publish_button = (key, message, retain = false) => {
        if (message.length) {
            mqtt_publish(key, message, retain)
            setMessage('')
        }
    }

    return <Card key={id} sx={{
        p: 2,
        borderRadius: 2,
        boxShadow: 3,
        transition: "0.3s",
        "&:hover": { boxShadow: 6 }
    }}>
        <CardContent>
            {/* Name (Type) on Left, Room on Right */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" fontWeight="bold">
                    {name} <Typography component="span" variant="body2" color="textSecondary">({types?.device[type].name})</Typography>
                </Typography>
                {room && <Typography variant="body2" color="textSecondary">{room}</Typography>}
            </Box>

            {/* Device Values */}
            {Object.keys(topics).map((key) =>
                topics[key].value ? (
                    <Box key={key} mt={1}>
                        <Typography variant="body1" sx={{ fontWeight: "bold", color: "primary.main" }}>
                            {topics[key].value} {TYPES_UNITS[topics[key].type]}
                        </Typography>

                        {/* Input + Send Button for Specific Types */}
                        {(topics[key].type === 17 || topics[key].type === 18 || topics[key].type === 20) && (
                            <Box display="flex" gap={1} mt={1}>
                                <TextField
                                    variant="outlined"
                                    size="small"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Enter value"
                                    sx={{ flexGrow: 1 }}
                                />
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={() => handle_publish_button(key, message, true)}
                                >
                                    Send
                                </Button>
                            </Box>
                        )}
                    </Box>
                ) : null
            )}
        </CardContent>
    </Card>

}
