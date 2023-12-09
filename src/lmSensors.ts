export const getSensorsHAEntity = (
  topic: string,
  deviceName: string,
  sensorName: string,
  sensorData: Record<string, any>
) => {
  let sensorType = undefined;
  let unit = undefined;
  if (Object.keys(sensorData).find((key) => key.startsWith("in"))) {
    sensorType = "voltage";
    unit = "V";
  }
  if (Object.keys(sensorData).find((key) => key.startsWith("temp"))) {
    sensorType = "temperature";
    unit = "°C";
  }
  if (Object.keys(sensorData).find((key) => key.startsWith("fan"))) {
    sensorType = null;
    unit = "RPM";
  }
  if (sensorType === undefined) {
    console.log("unknown sensor type", sensorName, sensorData);
    return null;
  }
  const x_input = Object.keys(sensorData).find((key) => key.endsWith("_input"));
  if (!x_input) return null;
  return {
    // availability: [
    //   {
    //     topic: `${topic}/server`,
    //     value_template: '{{ "online" }}',
    //   },
    // ],
    device: {
      identifiers: [`${topic}/${deviceName}`],
      manufacturer: "Unknown",
      model: "Unknown",
      name: deviceName,
    },
    enabled_by_default: true,
    device_class: sensorType,
    state_class: "measurement",
    name: sensorName,
    object_id: `lm-sensors_${deviceName}/${sensorName}`,
    origin: {
      name: "lm-sensors2mqtt",
      sw: "0.0.2",
    },
    unit_of_measurement: unit,
    state_topic: `${topic}/lm-sensors/${deviceName}`,
    unique_id: btoa(`lm-sensors_${deviceName}_${sensorName}`),
    value_template: `{{ value_json["${sensorName}"]["${x_input}"] }}`,
  };
};

