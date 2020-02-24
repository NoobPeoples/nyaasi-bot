import { Composer } from '@telegraf/core'
import { bot } from '../../core/bot.js'
import path from 'path'
import { buttons, buffer, sendFile } from '../../lib/index.js'
import { Nyaa } from '@ejnshtein/nyaasi'
import env from '../../env.js'
import torrentView from '../../views/inline-keyboard/torrent-view.js'
import torrentSearch from '../../views/inline-keyboard/torrent-search.js'

const composer = new Composer()

composer.start(
  Composer.privateChat(
    async ctx => {
      if (ctx.startPayload) {
        const text = buffer.decode(ctx.startPayload)
        switch (true) {
          case /download:[0-9]+/i.test(text): {
            const id = text.split(':').pop()
            try {
              await ctx.replyWithDocument({
                url: `https://${env.HOST}/download/${id}.torrent`,
                filename: `${id}.torrent`
              })
              return
            } catch (e) {}
            break
          }
          case /^\b(view|torrent):([0-9]+)$/i.test(text): {
            const id = text.split(':').pop()
            try {
              const { text, extra } = await torrentView(id, '')
              await ctx.reply(text, extra)
              return 
            } catch (e) {}
            break
          }
          case /query:[\S\s]+/i.test(text): {
            const [_, query] = text.match(/query:([\S\s])+/i)
            try {
              const { text, extra } = await torrentSearch(query)
              await ctx.reply(text, extra)
              return 
            } catch (e) {}
            break
          }
          case /magnet:[0-9]+/i.test(text): {
            const id = text.split(':').pop()
            try {
              const torrent = await Nyaa.getTorrentAnonymous(id, undefined, { baseUrl: `https://${env.HOST}` })
              await ctx.reply(`<a href="https://${env.HOST}/">&#8203;</a>${torrent.title}\n<code>${torrent.links.magnet}</code>`, {
                parse_mode: 'HTML',
                disable_web_page_preview: true,
                reply_markup: {
                  inline_keyboard: [
                    [
                      {
                        text: 'Open magnet',
                        url: `https://nyaasi.herokuapp.com/magnet/${torrent.links.magnet}`
                      }
                    ],
                    [
                      {
                        text: buttons.back,
                        callback_data: `t=${id}:p=1:o=0`
                      }
                    ]
                  ]
                }
              })
              return 
            } catch (e) {}
            break
          }
          case /file:[0-9]+:[0-9]+/i.test(text): {
            const splitted = text.split(':')
            const fileId = splitted.pop()
            const id = splitted.pop()
            try {
              const dbTorrent = await ctx.db('torrents').findOne({ id })
              if (dbTorrent && dbTorrent.files.length) {
                const file = dbTorrent.files.find(file => file.id === fileId)
                if (file) {
                  await sendFile(
                    ctx.chat.id,
                    file,
                    ctx.telegram,
                    {
                      caption: `#nyaa${id} ${file.id} of ${dbTorrent.files.length}\n"${path.basename(file.caption)}"`,
                      reply_markup: {
                        inline_keyboard: [
                          [
                            {
                              text: 'Torrent view',
                              url: `https://t.me/${ctx.me}?start=${buffer.encode(`view:${id}`)}`
                            }
                          ]
                        ]
                      }
                    }
                  )
                } else {
                  await ctx.reply('File not found')
                }
              }
            } catch (e) {}
          }
        }
      }
      return ctx.reply(`I'm ${env.WEBSITE_TITLE} website bot and i can help you to find some torrents on ${env.WEBSITE_TITLE} right here, in our beautiful Telegram!`, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'Let\'s find some torrents!',
                switch_inline_query_current_chat: ''
              }
            ]
          ]
        }
      })
    })
)

bot.use(composer.middleware())
