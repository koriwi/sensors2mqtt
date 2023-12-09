import { spawnSync } from "child_process";
import { connect } from "mqtt"; // import connect from mqtt
import { exit } from "process";
import { z } from "zod";
import { getSensorsHAEntity } from "./lmSensors";
import { getNvidiaSMIHAEntity, parseNvidiaSMI } from "./nvidia";

const envSchema = z.object({
  MQTT_URL: z.string().url(),
  MQTT_TOPIC: z.string().default("sensors2mqtt"),
  INTERVAL: z.preprocess((arg, ctx) => parseInt(String(arg), 10), z.number()).default(3000)
})
const envResult = envSchema.safeParse(process.env);
if (!envResult.success) {
  console.log("ERROR: Please set all required env vars")
  console.error(envResult.error.message)
  exit(1)
}
const env = envResult.data
setInterval(() => {
  // run sensors
  const resultLMSensors = spawnSync("sensors", [
    "-j"
  ]);
  if (resultLMSensors.status == 0) {
    const sensorsOutput = resultLMSensors.stdout.toString()
    let sensorsParsed: Record<string, string | Record<string, any>> = {}
    sensorsParsed = JSON.parse(sensorsOutput);
    for (const [deviceName, deviceData] of Object.entries(sensorsParsed)) {
      let client = connect(env.MQTT_URL);
      client.publish(`${env.MQTT_TOPIC}/lm-sensors/${deviceName}`, JSON.stringify(deviceData))
      for (const [sensorName, sensorData] of Object.entries(deviceData)) {
        if (sensorName === "Adapter") continue;
        const haEntity = getSensorsHAEntity(env.MQTT_TOPIC, deviceName, sensorName, sensorData)
        if (!haEntity) continue;
        client.publish(`homeassistant/sensor/${haEntity.object_id}/config`, JSON.stringify(haEntity))
      }
    }
  } else {
    console.error("could not launch sensors:", resultLMSensors.stderr.toString());
  }

  // run sensors
  const resultNvidiaSMI = spawnSync("nvidia-smi", [
    "--query-gpu=gpu_name,gpu_bus_id,temperature.gpu,utilization.gpu,utilization.memory,memory.free,memory.used", "--format=csv"
  ]);
  if (resultNvidiaSMI.status == 0) {
    let client = connect(env.MQTT_URL);
    const nvidiaSMIOutput = resultNvidiaSMI.stdout.toString()
    const nvidiaSMIParsed = parseNvidiaSMI(nvidiaSMIOutput);
    // console.log(nvidiaSMIParsed);
    for (const [deviceID, deviceData] of Object.entries(nvidiaSMIParsed)) {
      const cleanDeviceID = deviceID.replace(/:/g, "_").replace(/\./g, "_")
      client.publish(`${env.MQTT_TOPIC}/nvidia-smi/${cleanDeviceID}`, JSON.stringify(deviceData))
      for (const [sensorName, sensorData] of Object.entries(deviceData)) {
        try {
          const haEntity = getNvidiaSMIHAEntity(env.MQTT_TOPIC, deviceData["name"], cleanDeviceID, sensorName, sensorData)
          if (!haEntity) continue;
          client.publish(`homeassistant/sensor/${haEntity.object_id}/config`, JSON.stringify(haEntity))
        } catch (e) {
          console.log("could not generate ha entity", e as Error)
        }
      }

    }
  }

  let client = connect(env.MQTT_URL);
  client.publish(`${env.MQTT_TOPIC}/server`, JSON.stringify({ last_update: new Date().getTime() }))
  client.end()
}, 3000)