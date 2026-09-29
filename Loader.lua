-- ========================================================
-- SERAPHIM HUB
-- Biblioteca Fluent
-- ========================================================

local Fluent = loadstring(game:HttpGet(
    "https://raw.githubusercontent.com/dawid-scripts/Fluent/master/source.lua"
))()

-- ========================================================
-- JANELA PRINCIPAL
-- ========================================================

local Window = Fluent:CreateWindow({
    Title = "Seraphim-Hub",
    SubTitle = "by Delta User",
    TabWidth = 160,
    Size = UDim2.fromOffset(580, 460),
    Acrylic = false,
    Theme = "Dark",
    MinimizeKey = Enum.KeyCode.LeftControl
})

-- ========================================================
-- ABAS
-- ========================================================

local Tabs = {
    Main = Window:AddTab({
        Title = "Automação",
        Icon = "rbxassetid://4483345998"
    }),

    Teleport = Window:AddTab({
        Title = "Teleportes",
        Icon = "rbxassetid://4483345998"
    })
}

local Options = Fluent.Options

-- ========================================================
-- ABA: AUTOMAÇÃO
-- ========================================================

local AutoFarmToggle = Tabs.Main:AddToggle("AutoFarm", {
    Title = "Ativar Auto Farm",
    Default = false
})

-- Loop do Auto Farm
task.spawn(function()
    local VirtualUser = game:GetService("VirtualUser")

    while task.wait(0.1) do
        if AutoFarmToggle.Value then
            pcall(function()
                VirtualUser:CaptureController()
                VirtualUser:ClickButton1(Vector2.new(0, 0))
            end)
        end
    end
end)

-- ========================================================
-- SLIDER DE VELOCIDADE
-- ========================================================

local SpeedSlider = Tabs.Main:AddSlider("Speed", {
    Title = "Velocidade do Personagem",
    Description = "Altera a velocidade de corrida",
    Default = 16,
    Min = 16,
    Max = 150,
    Rounding = 0,
    Callback = function(Value)
        pcall(function()
            local Player = game:GetService("Players").LocalPlayer
            local Character = Player.Character
            local Humanoid = Character and Character:FindFirstChildOfClass("Humanoid")

            if Humanoid then
                Humanoid.WalkSpeed = Value
            end
        end)
    end
})

-- ========================================================
-- ABA: TELEPORTES
-- ========================================================

Tabs.Teleport:AddButton({
    Title = "Teleportar para o Topo/Base",
    Description = "Leva seu personagem para coordenadas seguras",

    Callback = function()
        pcall(function()
            local Player = game:GetService("Players").LocalPlayer
            local Character = Player.Character
            local RootPart = Character and Character:FindFirstChild("HumanoidRootPart")

            if RootPart then
                RootPart.CFrame = CFrame.new(0, 100, 0)

                Fluent:Notify({
                    Title = "Seraphim-Hub",
                    Content = "Teleportado com sucesso!",
                    Duration = 3
                })
            end
        end)
    end
})

-- ========================================================
-- SELECIONA A PRIMEIRA ABA
-- ========================================================

Window:SelectTab(1)

-- ========================================================
-- NOTIFICAÇÃO INICIAL
-- ========================================================

Fluent:Notify({
    Title = "Seraphim-Hub",
    Content = "Script carregado com sucesso!",
    Duration = 5
})
