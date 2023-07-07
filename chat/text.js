"use strict"
import axios from "axios";
import Chat from "./chat.js";
import Session from "./session.js";
import debug from "../comm/debug.js";
import { OpenAI } from "../service/openai.js";
import { MDUserMsg, MDGroupMsg } from "./template.js";
import { getAccessToken } from "../ding/accesstoken.js";

export default class TextChat extends Chat {

    constructor(name) {
        super(name);
        this.host = 'https://api.dingtalk.com';
    }

    async toUser(staffID, robotCode, answer) {
        /*response to dingtalk*/
        const token = await getAccessToken();
        debug.out(answer);

        const data = {
            "robotCode": robotCode,
            "userIds": [staffID],
            "msgKey": "sampleText",
            "msgParam": JSON.stringify({ "content": answer })
        };
        const url = this.host + '/v1.0/robot/oToMessages/batchSend';

        const config = {
            headers: {
                'Accept': "application/json",
                'Content-Type': "application/json",
                'x-acs-dingtalk-access-token': token
            }
        };

        const response = await axios.post(url, data, config);
        
        console.log("返回值1：",response);
        console.log("返回值2：",response.data);
        console.log("返回值3：",JSON.stringify({ "content": answer }));
        //debug.out(response.data); // 打印响应数据

        return response;
    }

    async toGroup(conversationID, robotCode, answer) {
        /*response to dingtalk*/
        const token = await getAccessToken();
        debug.out(answer);

        const data = {
            "robotCode": robotCode,
            "openConversationId": conversationID,
            "msgKey": "sampleText",
            "msgParam": JSON.stringify({ "content": answer })
        };

        const url = this.host + '/v1.0/robot/groupMessages/send';

        const config = {
            headers: {
                'Accept': "application/json",
                'Content-Type': "application/json",
                'x-acs-dingtalk-access-token': token
            }
        };
        response = axios.post(url, data, config);
        console.log("返回值4：",response);
        console.log("返回值5：",response.data);
        console.log("返回值6：",JSON.stringify({ "content": answer }));
        return response;
        //axios.post(url, data, config);
    }

    async reply(info, answer, res) {
        const senderId = info.senderId;
        const webHook = info.sessionWebhook;

        let markdown = null;
        if (info.conversationType === '1')
            markdown = MDUserMsg(answer.slice(0,30), answer);
        else if (info.conversationType === '2')
            markdown = MDGroupMsg(answer.slice(0,30), senderId, answer);
        console.log("发送的markdown值：",markdown);
        const headers = {
            'Content-Type': 'application/json',
            'url': webHook
        };
        const result = res.set(headers).send(JSON.stringify(markdown));
        console.log("最终发送值：",result);
        debug.log(result);
    }


    async process(info, res) {

        const question = info?.text?.content;

        if (!question) {
            res.status(400).send('Missing question');
            return;
        }

        const context = Session.update(info.conversationId, {"role":"user" ,"content":question});
        debug.out(context);

        const openai = new OpenAI();
        try {
            const result = await openai.ctChat(context);
            console.log(result)
            const message = result?.data?.choices[0]?.message;
            console.log("发送的result值：",message);
            debug.log(message?.content);
            if (!message?.content) {
                res.status(400).send('No answer found');
                return;
            }

            const answer = message.content;
            console.log("发送的answer值：",answer);
            await this.reply(info, answer, res);
            
            return;
        } catch (err) {
            debug.error(err);
            res.status(500).send('Internal server error');
            return;
        }
    }

}
