pushes lm-sensors and nvidia-smi to mqtt. Also creates home assistant sensors for these resources

```yaml
version: "3.3"
services:
  sensors2mqtt:
    restart: unless-stopped
    environment:
      - MQTT_URL=mqtt://mosquitto
      # - MQTT_TOPIC=sensors2mqtt #this is the default
      - INTERVAL=5000
    build: /opt/custom_docker/sensors2mqtt
    privileged: true
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              capabilities:
                - gpu
```
