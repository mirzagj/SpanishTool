import type { Exercise, TopicId } from '../types'
import { preterite, presentIrregular, serEstar } from './basics'
import { connectors, porPara, relatives } from './linking'
import { doublePronouns, objPronouns } from './pronouns'
import { reported, sePassive, wordOrder } from './structure'
import { siClauses, subjImperfect, subjPresent } from './subjunctive'
import { futCond, perfPret, pluperfect, pretImp } from './tenses'

export const EXERCISES: Exercise[] = [
  ...presentIrregular,
  ...serEstar,
  ...preterite,
  ...pretImp,
  ...perfPret,
  ...pluperfect,
  ...futCond,
  ...objPronouns,
  ...doublePronouns,
  ...subjPresent,
  ...subjImperfect,
  ...siClauses,
  ...porPara,
  ...connectors,
  ...relatives,
  ...sePassive,
  ...reported,
  ...wordOrder,
]

export const EXERCISE_BY_ID: Record<string, Exercise> = Object.fromEntries(EXERCISES.map((e) => [e.id, e]))

export const EXERCISES_BY_TOPIC = EXERCISES.reduce(
  (acc, e) => {
    ;(acc[e.topic] ||= []).push(e)
    return acc
  },
  {} as Record<TopicId, Exercise[]>,
)
