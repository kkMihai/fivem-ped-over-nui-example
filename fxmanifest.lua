fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name 'fivem-ped-over-nui-example'
author 'kkmihai'
description 'example: draw your UI as a DUI sprite to show ped above the ui'
version '1.0.0'

client_scripts {
    'dui2d.lua',
    'client.lua',
}

-- prod: `npm run build` in web/ first
ui_page 'web/build/index.html'

-- dev: swap the two ui_page lines and `npm run dev` in web/ for hot reload
-- ui_page 'http://localhost:5173/'

files {
    'web/build/*',
}
