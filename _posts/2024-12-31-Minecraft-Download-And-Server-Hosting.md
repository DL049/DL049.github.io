---
layout: post
title: Minecraft：下載與服務器架設
date: 2024-12-31 16:10
category: Minecraft
tags: [minecraft]
---

## 前言
本文會分爲兩個部分，客戶端與服務端，更側重於服務器架設的部分

## 客戶端

啓動器的選擇有很多種，這裏以HMCL爲例
從官網下載:

 HMCL官網: <https://hmcl.huangyuhui.net/>
 
 放到你想儲存游戲本體的目錄。

 然後就可以打開了，設定離線賬號，下載對應游戲版本，然後會提示你下載對應的JAVA環境
> 不建議使用啓動器内置的自定義皮膚功能，其本質是在覆寫游戲本體的皮膚材質資源
{: .prompt-warning }

## 服務端

服務器架設可分爲幾個階段：

1. 在内網啓動服務器
2. 從内網到公網

### 在内網啓動服務器
以下過程需要確保已經完成java的安裝。

到<https://www.minecraft.net/en-us/download/server>點按標綠的minecraft_server...jar，將文件下載移動到希望儲存伺服器的位置
```bash
java -Xmx1024M -Xms1024M -jar server.jar nogui
```
{: file='cmd'}

需要圖形界面的話，把nogui刪去即可。

第一次開啓會提醒我們，同意eula協議。
```sass
eula=true
```
{: file='eula.txt'}

然後用先前指令再啓動一次，服務器就算做開啓了。

接下來説明如何讓離綫賬號可以進入，首先打開server.properties找到online-mode改爲false。

```text
...
online-mode=false 
...
```
{: file='server.properties'}



這是在切斷服務器與MOJANG的伺服器的鏈接，因此選用這個選項説明你的服務器無法使用正常顯示皮膚，即便是正版賬號。
接下來可以打開cmd。
```bash
ipconfig
```
{: file='cmd'}

獲取你的内網IP。然後使用你的内網客戶端檢測服務器是否已經開啓。
沒有修改的情況下，端口默認是25565，因此打開MC多人模式增加伺服器后IP 可以寫"内網IP:25565"即可。
### 從内網到公網
理論上有很多種辦法，之前我用的是路由器直接Port Forwarding。但成大宿舍沒有路由器與對應權限，因此使用<https://playit.gg>來進行處理。這裏直接分享playit官方的教學。因爲很簡潔，不需要多作贅述。

{% include embed/youtube.html id='NK5lsDXIFnM' %}

