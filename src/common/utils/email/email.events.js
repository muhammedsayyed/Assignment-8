import { EventEmitter } from "events";
import { sendEmail } from "./send.email.js";
import { verifyEmailTemplate } from "./email.template.js";

export const emailEvent = new EventEmitter();

// send email asynchronously in the background
emailEvent.on("sendEmail", async ({ recipients, subject, data }) => {
    try {
        await sendEmail({
            ...recipients,
            subject,
            html: verifyEmailTemplate({ code: data.code, subject, title: data.title ?? subject })
        });
    } catch (err) {
        console.error("Failed to send email in event listener:", err);
    }
});
