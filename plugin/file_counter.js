(() => {
    const config = {
        // 启用脚本,若为false,以下配置全部失效
        ENABLE: true,
        // Typora允许打开小于2000000(即MAX_FILE_SIZE)的文件，大于maxSize的文件在搜索时将被忽略。若maxSize<0则不过滤
        MAX_SIZE: File.MAX_FILE_SIZE,
        // Typora允许打开的文件的后缀名，此外的文件在搜索时将被忽略
        ALLOW_EXT: ["", "md", "markdown", "mdown", "mmd", "text", "txt", "rmarkdown",
            "mkd", "mdwn", "mdtxt", "rmd", "mdtext", "apib"],
        LOOP_DETECT_INTERVAL: 300,
    };

    const Package = {
        Path: reqnode('path'),
        Fs: reqnode('fs'),
    };

    (() => {
        const css = `
        .typora-file-count {
            display: inline-block;
            float: right;
            white-space: nowrap;
            overflow-x: visible;
            overflow-y: hidden;
            margin-right: 10px;
            padding-left: 3px;
            padding-right: 3px;
            border-radius: 3px;
            background: var(--active-file-bg-color);
            color: var(--active-file-text-color);
            opacity: 1;
        }
        `
        const style = document.createElement('style');
        style.type = 'text/css';
        style.innerHTML = css;
        document.getElementsByTagName("head")[0].appendChild(style);
    })()

    const verifyExt = filename => {
        if (filename[0] === ".") {
            return false
        }
        const ext = Package.Path.extname(filename).replace(/^\./, '');
        if (~config.ALLOW_EXT.indexOf(ext.toLowerCase())) {
            return true
        }
    }
    const verifySize = (stat) => 0 > config.MAX_SIZE || stat.size < config.MAX_SIZE;
    const allowRead = (filepath, stat) => verifySize(stat) && verifyExt(filepath);

    const countFiles = (dir, filter, then) => {
        let fileCount = 0;

        async function traverse(dir) {
            const files = await Package.Fs.promises.readdir(dir);
            for (const file of files) {
                const filePath = Package.Path.join(dir, file);
                const stats = await Package.Fs.promises.stat(filePath);
                if (stats.isFile() && filter(filePath, stats)) {
                    fileCount++;
                }
                if (stats.isDirectory()) {
                    await traverse(filePath);
                }
            }
        }

        traverse(dir).then(() => then(fileCount)).catch(err => console.error(err));
    }

    const getChild = (ele, className) => {
        for (const child of ele.children) {
            if (child.classList.contains(className)) {
                return child
            }
        }
        return false
    }

    const setDirCount = treeNode => {
        const dir = treeNode.getAttribute("data-path");
        countFiles(dir, allowRead, fileCount => {
            let countDiv = getChild(treeNode, "typora-file-count");
            if (!countDiv) {
                countDiv = document.createElement("div");
                countDiv.classList.add("typora-file-count");
                const background = treeNode.querySelector(".file-node-background");
                treeNode.insertBefore(countDiv, background.nextElementSibling);
            }
            countDiv.innerText = fileCount + "";
        })

        const children = getChild(treeNode, "file-node-children");
        if (children && children.children) {
            children.children.forEach(child => {
                if (child.getAttribute("data-has-sub") === "true") {
                    setDirCount(child);
                }
            })
        }
    }

    const setAllDirCount = () => {
        const root = document.querySelector("#file-library-tree > .file-library-node");
        if (!root) {
            return false
        }
        console.log("setAllDirCount");
        setDirCount(root);
        return true
    }

    new MutationObserver(mutationList => {
        if (mutationList.length === 1) {
            const add = mutationList[0].addedNodes[0];
            if (add && add.classList && add.classList.contains("file-library-node")) {
                setDirCount(add);
                return
            }
        }

        for (const mutation of mutationList) {
            if (mutation.target && mutation.target.classList && mutation.target.classList.contains("typora-file-count")
                || mutation.addedNodes[0] && mutation.addedNodes[0].classList && mutation.addedNodes[0].classList.contains("typora-file-count")) {
                continue
            }
            setAllDirCount();
            return
        }
    }).observe(document.getElementById("file-library-tree"), {subtree: true, childList: true});

    const _timer = setInterval(() => {
        if (setAllDirCount()) {
            clearInterval(_timer);
        }
    }, config.LOOP_DETECT_INTERVAL);

    console.log("file_counter.js had been injected");
})()