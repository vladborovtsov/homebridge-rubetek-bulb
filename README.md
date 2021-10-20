# homebridge-rubetek-bulb

Homebridge accessory plugin for Rubetek WiFi lightbulbs. Tested with GU-10 (RL-3105) and E27 (RL-3103) lightbulbs. Works with Homebridge UI X.

## Installation

Inside your homebridge instance: 
- `git clone https://github.com/vladborovtsov/homebridge-rubetek-bulb.git`
- `cd homebridge-rubetek-bulb/`
- `npm i --also-dev`
- `npm run build`
- `npm install -g`

## Setup & Configuation

### Getting the device identifiers

To link your lightbulb, you will need to find out your lightbulb's device ID and house ID.

To do that, run this command (replace `username` and `password` with your credentials)

```bash
curl -u username:password https://ccc.rubetek.com/v2/houses/ | python -m json.tool
```

You will be able to find the required details in the output

```json
{
    "success": true,
    "houses": [
        {
            "id": 123456,
            "name": "My home",
            ...
            "devices": [
                {
                    "id": "03aea823-fa3b-4188-9e7d-6d0c0768eb1e",
                    ...
                    "type": "wifi_lamprgb_1_v1",
                    "localSettings": {
                        ...
                        "name": "Wi-Fi RGB lamp",
```

### 
