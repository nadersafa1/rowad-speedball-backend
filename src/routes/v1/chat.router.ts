import express from 'express'
import { chatController } from '../../controllers/chat.controller'

const chatRouter = express.Router()

chatRouter.post('/chat', chatController.sendMessage)
chatRouter.post('/bank-sms', chatController.sendBankSMS)

export default chatRouter
