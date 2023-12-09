export const parseNvidiaSMI = (nvidiaSMIOutput: string) => {
  let nvidiaSMIParsed: Record<string, Record<string, string>> = {}
  const header = nvidiaSMIOutput.split("\n")[0];
  const cols = header.split(",");
  const rows = nvidiaSMIOutput.split("\n").slice(1)
  for (const row of rows) {
    const data = row.split(",");
    if (data.length !== cols.length) continue;
    const deviceData: Record<string, string> = {}
    for (const index in cols) {
      const column = cols[index].trim().replace(" [%]", "").replace(" [MiB]", "");
      deviceData[column] = data[index].trim().replace(" %", "").replace(" MiB", "");
    }
    nvidiaSMIParsed[deviceData["pci.bus_id"]] = deviceData
  }
  return nvidiaSMIParsed;
}

export const getNvidiaSMIHAEntity = (
  topic: string,
  model: string,
  deviceName: string,
  sensorName: string,
  sensorData: string
) => {
  if (sensorName === "pci.bus_id" || sensorName === "name") return null;
  let sensorType = undefined;
  let unit = undefined;
  let data = sensorData.trim();
  if (sensorName === "temperature.gpu") {
    sensorType = "temperature";
    unit = "°C";
  }
  if (sensorName === "utilization.gpu" || sensorName === "utilization.memory") {
    sensorType = null;
    unit = "%";
    data = data.replace("%", "").trim();
  }
  if (sensorName === "memory.free" || sensorName === "memory.used") {
    sensorType = null;
    unit = "MiB";
    data = data.replace("MiB", "").trim();
  }
  if (sensorType === undefined) {
    console.log("unknown sensor type", sensorName, sensorData);
    return null;
  }
  const cleanSensorName = sensorName.replace(".", "_").replace(" ", "_");
  return {
    // availability: [
    //   {
    //     topic: `${topic}/server`,
    //     value_template: '{{ "online" }}',
    //   },
    // ],
    device: {
      identifiers: [`${topic}/${deviceName}`],
      manufacturer: "NVidia",
      model,
      name: deviceName,
    },
    enabled_by_default: true,
    device_class: sensorType,
    state_class: "measurement",
    name: cleanSensorName,
    object_id: `nvidia-smi_${deviceName}/${cleanSensorName}`,
    origin: {
      name: "nvidia-smi2mqtt",
      sw: "0.0.2",
    },
    unit_of_measurement: unit,
    state_topic: `${topic}/nvidia-smi/${deviceName}`,
    unique_id: btoa(`nvidia-smi_${deviceName}_${cleanSensorName}`),
    value_template: `{{ value_json["${sensorName}"] }}`,
  };
};
