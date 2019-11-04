// 库
import * as _ from 'lodash';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as cheerio from 'cheerio';
import * as precinct from 'precinct';
// 自己的库
import FileTool from '../FileTool';
// 定义
import {
    PrecinctOptions,
} from '../../interface';

/**
 * 依赖分析树基础类
 */
export default class AstBase {
    /**
     * 根据precinct库获取依赖文件
     * @param filePath [文件路径]
     * @param type     [分析类型: es6、commonjs、css]
     */
    protected static getDependencyFromPrecinct(filePath: string, type = 'es6'): string[] {
        try {
            // 配置项
            const config: PrecinctOptions = {};
            // 获取文件内容
            const content = fs.readFileSync(filePath, 'utf8');

            // 更新type
            if (type === 'commonjs' || type === 'css') {
                config.type = type;
            }
            // 开启混合模式，同时运行es6和commonjs
            if (type === 'es6') {
                config.es6 = {
                    mixedImports: true,
                };
            }

            // 返回依赖文件数组
            return precinct(content, config);
        } catch (e) {
            // 异常，直接返回空数组
            return [];
        }
    }

    /**
     * 根据cheerio库获取依赖文件
     * @param filePath [文件路径]
     */
    protected static getDependencyFromCheerio(filePath: string): string[] {
        // 包含wxs文件的结果
        const result = new Set<string>();

        try {
            // 获取文件内容
            const content = fs.readFileSync(filePath, 'utf8');

            // 以XML模式解析，不然import解析不了
            // 无法使用其他XML解析库的原因是: wxml的attribute允许为空
            // TODO: 后续考虑找一些AST解析库来替代cheerio库
            const $ = cheerio.load(content, {
                xmlMode: true,
            });
            // 获取wxs、import、include标签
            const wxsArr = $('wxs');
            const importArr = $('import');
            const includeArr = $('include');

            // 遍历获取wxs，不使用cheerio的api以提高性能
            for (let i = 0, len = wxsArr.length; i < len; i += 1) {
                const {
                    src,
                } = wxsArr[i].attribs;

                src && result.add(src);
            }
            // 遍历获取wxml
            for (let i = 0, len = importArr.length; i < len; i += 1) {
                const {
                    src,
                } = importArr[i].attribs;

                src && result.add(src);
            }
            for (let i = 0, len = includeArr.length; i < len; i += 1) {
                const {
                    src,
                } = includeArr[i].attribs;

                src && result.add(src);
            }
        } catch (e) {
            // do nothing
        }

        return [...result];
    }

    /**
     * 过滤.wxs文件
     * @param entry    [入口路径]
     * @param source   [根据入口路径解析的结果]
     * @param wxsFiles [.wxs文件]
     */
    protected static filterWxsFiles(
        entry: string, source: string[], wxsFiles: Set<string>,
    ): string[] {
        return source.filter((item) => {
            // 获取文件后缀
            const ext = path.extname(item);

            // 后缀是wxs，就加入wxsFiles
            ext === '.wxs' && wxsFiles.add(AstBase.formatFilePath(item, entry, 'wxs'));

            return ext !== '.wxs';
        });
    }

    /**
     * 格式化文件路径
     * @param source [待格式化的路径]
     * @param entry  [入口文件路径]
     * @param type   [文件类型]
     */
    protected static formatFilePath(source: string, entry: string, type: string): string {
        // 获取绝对路径
        let result = FileTool.getAbsolutePath(entry, source);
        // 获取后缀
        const ext = path.extname(result);
        // 没有后缀则补全
        if (_.isEmpty(ext)) {
            result += `.${type}`;
        } else if (type === 'js' && ext !== '.js' && ext !== '.json') {
            // 兼容.min类似的情况
            // TODO: 这里这样替换是否可能存在隐患？
            result += `.${type}`;
        }
        // 返回结果
        return result;
    }
}