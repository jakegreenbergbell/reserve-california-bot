# Reserve California bot
Check availability of campgrounds in the Reserve California system from anywhere.

## Get started

In order to run the bot with alerts, create a .env file with your Twilio authorization token, account SID, and phone number:
```
TWILIO_AUTH_TOKEN="<twilio_auth_token>"
TWILIO_ACCOUNT_SID="<twilio_account_sid>"
TWILIO_PHONE_NUMBER_FROM="<twilio_phone_number_from"
PHONE_NUMBER_TO="<phone_number_to_send_alerts>"
```

Run the following command in the terminal to download the required packages:
```
npm install
```

Then run the following command in the terminal to start the bot:
```
ts-node main.ts
```

## Options
`ts-node main.ts` can be customized for campgrounds, start date, end date, Twilio from number, and phone number to send alerts.   

`-c, -campground` : all the campgrounds to check for, e.g. `-c "Big Sur Main Camp" "Big Sur South Camp" "Big Sur Weyland Camp"` to check for all campground areas in Pfeiffer Big Sur State Park, current options are listed in `campgrounds.ts`
`-s, -start` : check-in date "YYYY-MM-DD"    
`-e, -end` : check-out date "YYYY-MM-DD"   
`-f, -from` : phone number to send the alert from (can be found in Twilio account)   
`-t, -to` : phone number to send alert to    
