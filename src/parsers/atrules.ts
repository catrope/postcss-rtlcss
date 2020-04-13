import postcss, { Root, Node, Rule, AtRule, vendor } from 'postcss';
import rtlcss from 'rtlcss';
import { RulesObject, AtRulesObject, AtRulesStringMap, KeyFramesData, PluginOptionsNormalized, Source } from '@types';
import { AT_RULE_TYPE, RULE_TYPE, KEYFRAMES_NAME } from '@constants';
import { walkContainer } from '@utilities/containers';
import { parseDeclarations } from './declarations';

export const getKeyFramesStringMap = (keyframes: AtRulesObject[]): AtRulesStringMap => {    
    const stringMap: AtRulesStringMap = {};    
    keyframes.forEach((obj: AtRulesObject): void => {
        stringMap[obj.atRuleParams] = {
            name: obj.atRule.params,
            nameFlipped: obj.atRuleFlipped.params
        };
    });
    return stringMap;
};

export const getKeyFramesRegExp = (stringMap: AtRulesStringMap): RegExp => new RegExp(`(^| )(${ Object.keys(stringMap).join('|') })( |$)`, 'g');

export const parseAtRules = (
    rules: RulesObject[],
    keyFrameData: KeyFramesData,
    css: Root,
    options: PluginOptionsNormalized
): void => {

    walkContainer(css, [ AT_RULE_TYPE, RULE_TYPE ], false, (node: Node): void => {
        
        if (node.type !== AT_RULE_TYPE) return;

        const atRule = node as AtRule;

        if (vendor.unprefixed(atRule.name) === KEYFRAMES_NAME) return;

        atRule.walkRules((rule: Rule): void => {
            parseDeclarations(rules, keyFrameData, rule, options);
        });

    });

};

export const parseKeyFrames = (
    keyframes: AtRulesObject[],
    css: Root,
    options: PluginOptionsNormalized
): void => {

    const { source, processUrls, useCalc, stringMap } = options;

    walkContainer(css, [ AT_RULE_TYPE, RULE_TYPE ], false, (node: Node): void => {

        if (node.type !== AT_RULE_TYPE) return;

        const atRule = node as AtRule;
        
        if (vendor.unprefixed(atRule.name) !== KEYFRAMES_NAME) return;
        
        const atRuleString = atRule.toString();
        const atRuleFlippedString = rtlcss.process(atRuleString, { processUrls, useCalc, stringMap });
        
        if (atRuleString === atRuleFlippedString) return;

        const rootFlipped = postcss.parse(atRuleFlippedString);
        const atRuleFlipped = rootFlipped.first as AtRule;

        const atRuleParams = atRule.params;
        const ltr = `${atRuleParams}-${Source.ltr}`;
        const rtl = `${atRuleParams}-${Source.rtl}`;

        atRule.params = source === Source.ltr ? ltr : rtl;
        atRuleFlipped.params = source === Source.ltr ? rtl : ltr;

        keyframes.push({
            atRuleParams,
            atRule,
            atRuleFlipped
        });
        
    });

};