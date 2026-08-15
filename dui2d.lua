--- drop this file in your resource, load it before your client script, and u
--- get Dui2D.Show() / Dui2D.Hide() to wrap around your menu
---
--- it loads your ui_page a second time as a DUI and draws that copy behind
--- the pause menu, so the ped ends up on top of your ui. keeping the two
--- copies in sync is the page's job (src/dui.ts), not yours
---@class Dui2D
Dui2D = {}

--- what the page posts to 'dui:mouse'
---@class DuiMouseData
---@field type 'down' | 'up' | 'wheel'
---@field button? 'left' | 'right' | 'middle' defaults to left
---@field dx? number horizontal wheel delta
---@field dy? number vertical wheel delta

---@type string
local res = GetCurrentResourceName()

-- runtime txd names stays across a resource restart, rebinding the same name fails
---@type string
local txdName = ('%s_%d'):format(res, GetGameTimer())

---@type string
local txnName = 'page'

--- the DUI object, nil until the first Dui2D.Show()
---@type integer?
local browser

---@type boolean
local active = false

--- builds the url for the mirror copy, with dui=1 so the page knows which one it is
---@return string url
local function pageUrl()
    local page = GetResourceMetadata(res, 'ui_page', 0)

    -- ui_page is a vite dev url while developing, a file on disk once built
    local url = page:match('^https?://') and page or ('nui://%s/%s'):format(res, page)

    return url .. (url:find('?', 1, true) and '&' or '?') .. 'dui=1'
end

--- creates the DUI and binds it to a runtime texture, once per resource lifetime
---@return integer browser
local function ensure()
    if browser then return browser end

    local w, h = GetActiveScreenResolution()

    browser = CreateDui(pageUrl(), w, h)
    CreateRuntimeTextureFromDuiHandle(CreateRuntimeTxd(txdName), txnName, GetDuiHandle(browser))

    return browser --[[@as integer]]
end

--- sends a message to the DUI copy only
---
--- you rarely want this one, SendNUIMessage right below already reaches both
--- copies. its here for when the mirror needs something the real copy doesnt
---@param data table anything json.encode takes
---@return nil
function Dui2D.Send(data)
    if browser then
        SendDuiMessage(browser, json.encode(data))
    end
end

-- every SendNUIMessage in this resource reaches both copies
---@type fun(data: table)
local toNui = SendNUIMessage

--- the same SendNUIMessage u already use, it just also forwards to the mirror
---@param data table
---@return nil
function SendNUIMessage(data)
    toNui(data)
    Dui2D.Send(data)
end

--- call it when your menu opens, after the ped is already in the pause menu
---
--- takes nui focus, creates the DUI on the first call and starts drawing it
--- behind the pause menu. calling it twice does nothing, so dont worry
---@return nil
function Dui2D.Show()
    if active then return end
    active = true

    local view = ensure()

    SetNuiFocus(true, true)
    SendNUIMessage({ __dui = 'active', active = true })

    CreateThread(function()
        while active do
            SetMouseCursorVisibleInMenus(false) -- disable native gta cursor since we have the NUI one

            SetScriptGfxDrawBehindPausemenu(true)
            DrawSprite(txdName, txnName, 0.5, 0.5, 1.0, 1.0, 0.0, 255, 255, 255, 255)

            local x, y = GetNuiCursorPosition()
            SendDuiMouseMove(view, x, y)

            Wait(0)
        end
    end)
end

--- call it when your menu closes
---
--- drops focus and stops drawing. the browser is kept on purpose so opening
--- the menu again is instant, it only gets destroyed with the resource
---@return nil
function Dui2D.Hide()
    if not active then return end
    active = false

    SetNuiFocus(false, false)
    SendNUIMessage({ __dui = 'active', active = false })
end

--- true while the mirror is being drawn
---@return boolean active
function Dui2D.IsActive()
    return active
end

-- clicks and wheel, the page posts these itself, u never trigger them
RegisterNUICallback('dui:mouse',
    ---@param data DuiMouseData
    ---@param cb fun(result: any)
    function(data, cb)
        cb(1)

        if not browser then return end

        if data.type == 'down' then
            SendDuiMouseDown(browser, data.button or 'left')
        elseif data.type == 'up' then
            SendDuiMouseUp(browser, data.button or 'left')
        elseif data.type == 'wheel' then
            SendDuiMouseWheel(browser, -(tonumber(data.dy) or 0), tonumber(data.dx) or 0)
        end
    end)

-- keys, typed text and whatever DUI.pushState sends, it all goes straight across
RegisterNUICallback('dui:forward',
    ---@param data table
    ---@param cb fun(result: any)
    function(data, cb)
        cb(1)
        Dui2D.Send(data)
    end)

AddEventHandler('onResourceStop',
    ---@param name string
    function(name)
        if name ~= res then return end

        if browser then
            DestroyDui(browser)
            browser = nil
        end
    end)
