local ped
local open = false
local column = 1
local moving = false

local function makeClone()
    local clone = ClonePed(PlayerPedId(), false, false, true)

    if not clone or clone == 0 then return end

    SetEntityVisible(clone, false, false)
    SetEntityCollision(clone, false, false)
    FreezeEntityPosition(clone, true)

    local x, y, z = table.unpack(GetEntityCoords(clone))
    SetEntityCoords(clone, x, y, z - 10.0, true, false, false, true)

    return clone
end

local function cleanup()
    open = false

    Dui2D.Hide()
    ClearPedInPauseMenu()
    SetMouseCursorVisibleInMenus(true)
    SetFrontendActive(false)
    ReplaceHudColourWithRgba(117, 0, 0, 0, 186) -- default pause menu background

    if ped and DoesEntityExist(ped) then
        DeleteEntity(ped)
    end

    ped = nil
end

local function show()
    if open then return end
    open = true

    SetFrontendActive(true)
    ActivateFrontendMenu(`FE_MENU_VERSION_EMPTY_NO_BACKGROUND`, false, -1)

    Wait(100)

    ReplaceHudColourWithRgba(117, 0, 0, 0, 0) -- make the pause menu background transparent

    ped = makeClone()

    if not ped then
        open = false
        SetFrontendActive(false)
        ReplaceHudColourWithRgba(117, 0, 0, 0, 186) -- default pause menu background if we failed to make a clone
        return
    end

    Wait(100)

    GivePedToPauseMenu(ped, column)
    SetPauseMenuPedLighting(true)
    SetPauseMenuPedSleepState(true)

    Dui2D.Show()
end

RegisterNUICallback('close', function(_, cb)
    cb(1)
    cleanup()
end)

-- the pause menu only has 3 spots: 0 left, 1 middle, 2 right.
RegisterNUICallback('pedpos', function(data, cb)
    cb(1)

    if not open or not ped then return end

    local newColumn = math.max(0, math.min(2, column + (tonumber(data.dir) or 0)))

    if newColumn == column then return end

    column = newColumn

    if moving then return end
    moving = true

    CreateThread(function()
        while true do
            local target = column

            ClearPedInPauseMenu()

            if ped and DoesEntityExist(ped) then
                DeleteEntity(ped)
            end

            ped = makeClone()

            if not ped then break end

            Wait(100)

            if not open then break end

            GivePedToPauseMenu(ped, column)
            SetPauseMenuPedLighting(true)
            SetPauseMenuPedSleepState(true)

            if column == target then break end
        end

        moving = false
    end)
end)

RegisterCommand('pedui', function()
    if open then cleanup() else show() end
end, false)

AddEventHandler('onResourceStop', function(name)
    if name == GetCurrentResourceName() then
        cleanup()
    end
end)
